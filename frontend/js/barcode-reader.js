// ============================================
// LEITOR DE CÓDIGO DE BARRAS - VERSÃO CORRIGIDA
// ============================================

const BarcodeReader = {
    scanner: null,
    isScanning: false,
    callback: null,
    
    init() {
        this.criarModal();
        this.carregarBiblioteca();
    },
    
    carregarBiblioteca() {
        return new Promise((resolve, reject) => {
            if (window.Quagga) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/quagga/dist/quagga.min.js';
            script.onload = () => {
                console.log('✅ Biblioteca Quagga carregada');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Erro ao carregar Quagga');
                // Fallback: usar input manual
                this.fallbackModoManual();
                reject();
            };
            document.head.appendChild(script);
        });
    },
    
    fallbackModoManual() {
        const mensagem = 'Leitor de código não disponível. Deseja digitar manualmente?';
        if (confirm(mensagem)) {
            const codigo = prompt('Digite o código de barras:');
            if (codigo && this.callback) {
                this.callback(codigo);
            }
        }
    },
    
    criarModal() {
        // Verificar se o modal já existe
        if (document.getElementById('modalBarcodeReader')) return;
        
        const modalHTML = `
            <div class="modal" id="modalBarcodeReader">
                <div class="modal-content" style="max-width: 600px; padding: 0; overflow: hidden;">
                    <div style="position: relative; background: #000; min-height: 400px;">
                        <div id="barcode-video-container" style="width: 100%; height: 400px; background: #000;"></div>
                        <div id="barcode-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;">
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; height: 100px; border: 2px solid var(--accent-primary); border-radius: 10px; box-shadow: 0 0 0 999px rgba(0,0,0,0.5);"></div>
                        </div>
                        <div id="barcode-message" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center; z-index: 10; background: rgba(0,0,0,0.7); padding: 15px 25px; border-radius: 30px; border: 1px solid var(--accent-primary);">
                            <div class="spinner" style="width: 30px; height: 30px; margin: 0 auto 10px; border-top-color: var(--accent-primary);"></div>
                            <p>Inicializando câmera...</p>
                        </div>
                    </div>
                    <div style="padding: 20px; text-align: center;">
                        <div style="display: flex; gap: 15px; justify-content: center;">
                            <button class="btn btn-danger" onclick="BarcodeReader.fechar()">
                                Cancelar
                            </button>
                            <button class="btn btn-secondary" onclick="BarcodeReader.fallbackModoManual()">
                                Digitar Manualmente
                            </button>
                        </div>
                        <p style="margin-top: 15px; color: var(--text-muted); font-size: 12px;">
                            Aproxime o código de barras da câmera
                        </p>
                    </div>
                    <button class="close" onclick="BarcodeReader.fechar()" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 20px; cursor: pointer;">✕</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    async abrir(callback) {
        this.callback = callback;
        
        try {
            const modal = document.getElementById('modalBarcodeReader');
            if (!modal) this.criarModal();
            
            document.getElementById('modalBarcodeReader').style.display = 'block';
            
            await this.carregarBiblioteca();
            this.iniciarLeitura();
        } catch (error) {
            console.error('Erro ao abrir leitor:', error);
            this.fallbackModoManual();
        }
    },
    
    fechar() {
        const modal = document.getElementById('modalBarcodeReader');
        if (modal) modal.style.display = 'none';
        this.pararLeitura();
    },
    
    iniciarLeitura() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        const container = document.getElementById('barcode-video-container');
        const message = document.getElementById('barcode-message');
        
        if (message) message.style.display = 'none';
        
        if (!window.Quagga) {
            Notificacao.mostrar('Biblioteca não carregada', 'danger');
            this.fallbackModoManual();
            return;
        }
        
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: container,
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment"
                },
            },
            decoder: {
                readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "code_128_reader",
                    "code_39_reader",
                    "upc_reader",
                    "upc_e_reader"
                ],
                multiple: false
            },
            locate: true,
            numOfWorkers: 2
        }, (err) => {
            if (err) {
                console.error('Erro ao iniciar Quagga:', err);
                Notificacao.mostrar('Erro ao acessar câmera', 'danger');
                this.fallbackModoManual();
                this.isScanning = false;
                return;
            }
            
            Quagga.start();
            
            Quagga.onDetected((data) => {
                const code = data.codeResult.code;
                console.log('📷 Código detectado:', code);
                
                // Vibrar se disponível
                if (navigator.vibrate) navigator.vibrate(100);
                
                this.pararLeitura();
                
                if (this.callback) {
                    this.callback(code);
                }
                
                setTimeout(() => this.fechar(), 300);
            });
        });
    },
    
    pararLeitura() {
        if (window.Quagga) {
            Quagga.stop();
            Quagga.offDetected();
        }
        this.isScanning = false;
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    BarcodeReader.init();
});