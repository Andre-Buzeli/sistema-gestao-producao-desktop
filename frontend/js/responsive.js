/**
 * Script para melhorar a responsividade da interface
 * Adapta a interface para diferentes tamanhos de tela
 */

// Função para ajustar o layout com base no tamanho da tela
function adjustLayout() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1200;

    // Adiciona classes ao body para facilitar o CSS
    document.body.classList.toggle('landscape', isLandscape);
    document.body.classList.toggle('portrait', !isLandscape);
    document.body.classList.toggle('mobile', isMobile);
    document.body.classList.toggle('tablet', isTablet);
    document.body.classList.toggle('desktop', width >= 1200);

    // Ajusta o cabeçalho para diferentes tamanhos de tela
    adjustHeader();

    // Ajusta a altura da tela principal
    const header = document.querySelector('header');
    const headerHeight = header ? header.offsetHeight : 60;
    const mainScreen = document.getElementById('main-screen');

    if (mainScreen) {
        mainScreen.style.height = `calc(100vh - ${headerHeight}px)`;
    }

    // Ajusta a altura da grade de produtos
    const productsContainer = document.getElementById('products-container');
    const tabs = document.querySelector('.tabs');
    const categoryHeader = document.querySelector('.category-header');
    const finishButton = document.querySelector('.finish-button-container');

    if (productsContainer && tabs && categoryHeader && finishButton) {
        const tabsHeight = tabs.offsetHeight;
        const categoryHeaderHeight = categoryHeader.offsetHeight;
        const finishButtonHeight = finishButton.offsetHeight;
        const availableHeight = window.innerHeight - headerHeight - tabsHeight - categoryHeaderHeight - finishButtonHeight;

        productsContainer.style.maxHeight = `${availableHeight}px`;
    }

    // Mantém sempre 3 colunas na grade de produtos, independente do tamanho da tela
    if (productsContainer) {
        // Sempre 3 colunas, mas ajusta o espaçamento com base no tamanho da tela
        productsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';

        // Ajusta o espaçamento entre os cards com base no tamanho da tela
        if (width < 360) {
            productsContainer.style.gap = '4px';
            productsContainer.style.padding = '4px';
        } else if (width < 480) {
            productsContainer.style.gap = '5px';
            productsContainer.style.padding = '5px';
        } else if (width < 768) {
            productsContainer.style.gap = '10px';
            productsContainer.style.padding = '10px';
        } else {
            productsContainer.style.gap = '20px';
            productsContainer.style.padding = '20px';
        }
    }

    // Ajusta o tamanho dos ícones com base na largura da tela para manter proporção com os cards
    const productIcons = document.querySelectorAll('.product-icon');
    productIcons.forEach(icon => {
        if (width < 360) {
            // Celulares muito pequenos
            icon.style.fontSize = '30px';
            icon.style.marginTop = '-2px';
        } else if (width < 480) {
            // Celulares
            icon.style.fontSize = '40px';
            icon.style.marginTop = '-5px';
        } else if (width < 768) {
            // Tablets pequenos
            icon.style.fontSize = '50px';
            icon.style.marginTop = '-10px';
        } else if (width < 1200) {
            // Tablets e laptops
            icon.style.fontSize = '90px';
            icon.style.marginTop = '-15px';
        } else {
            // Desktops
            icon.style.fontSize = '120px';
            icon.style.marginTop = '-25px';
        }
    });

    // Ajusta o tamanho dos nomes dos produtos para manter proporção com os cards
    const productNames = document.querySelectorAll('.product-name');
    productNames.forEach(name => {
        if (width < 360) {
            // Celulares muito pequenos
            name.style.fontSize = '10px';
            name.style.lineHeight = '1';
            name.style.marginTop = '0';
            name.style.padding = '0 2px';
        } else if (width < 480) {
            // Celulares
            name.style.fontSize = '12px';
            name.style.lineHeight = '1.1';
            name.style.marginTop = '0';
            name.style.padding = '0 2px';
        } else if (width < 768) {
            // Tablets pequenos
            name.style.fontSize = '14px';
            name.style.lineHeight = '1.2';
            name.style.marginTop = '5px';
            name.style.padding = '0 5px';
        } else if (width < 1200) {
            // Tablets e laptops
            name.style.fontSize = '18px';
            name.style.lineHeight = '1.3';
            name.style.marginTop = '5px';
        } else {
            // Desktops
            name.style.fontSize = '24px';
            name.style.lineHeight = '1.3';
            name.style.marginTop = '10px';
        }
    });
}

// Função para garantir que as abas de categorias sejam distribuídas igualmente
function ensureTabsVisibility() {
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;

    // Obtém todas as abas
    const tabElements = tabs.querySelectorAll('.tab');
    if (!tabElements.length) return;

    // Distribui as abas igualmente
    const tabCount = tabElements.length;
    const tabWidth = `${100 / tabCount}%`;

    // Aplica a largura igual a todas as abas
    tabElements.forEach(tab => {
        tab.style.flex = '1';
        tab.style.minWidth = '0';
        tab.style.maxWidth = 'none';
        tab.style.width = tabWidth;
        tab.style.boxSizing = 'border-box';
        tab.style.textAlign = 'center';
        tab.style.display = 'flex';
        tab.style.flexDirection = 'column';
        tab.style.alignItems = 'center';
        tab.style.justifyContent = 'center';
    });

    // Ajusta o tamanho do texto e ícones com base na largura da tela
    const width = window.innerWidth;
    tabElements.forEach(tab => {
        const icon = tab.querySelector('.tab-icon');
        const text = tab.querySelector('span');

        if (width < 360) {
            // Celulares muito pequenos
            if (icon) icon.style.fontSize = '18px';
            if (text) text.style.fontSize = '10px';
        } else if (width < 480) {
            // Celulares
            if (icon) icon.style.fontSize = '20px';
            if (text) text.style.fontSize = '12px';
        } else if (width < 768) {
            // Tablets pequenos
            if (icon) icon.style.fontSize = '24px';
            if (text) text.style.fontSize = '14px';
        } else {
            // Tablets e desktops
            if (icon) icon.style.fontSize = '32px';
            if (text) text.style.fontSize = '16px';
        }
    });
}

// Função para ajustar a altura dos cards de produto para manter proporção
function adjustProductCardHeight() {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        // Define a altura com base na largura para manter proporção
        const width = card.offsetWidth;
        card.style.height = `${width * 1.2}px`; // Proporção de 1.2 (altura = largura * 1.2)
    });
}

// Função para melhorar a experiência em dispositivos touch
function enhanceTouchExperience() {
    // Adiciona classe 'touch' ao body se for um dispositivo touch
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add('touch-device');

        // Aumenta o tamanho dos elementos clicáveis em dispositivos touch
        const clickableElements = document.querySelectorAll('button, .tab, .product-card, input[type="text"], input[type="number"]');
        clickableElements.forEach(element => {
            element.classList.add('touch-target');
        });
    }
}

// Função para ajustar o layout quando o teclado virtual é exibido em dispositivos móveis
function handleVirtualKeyboard() {
    const originalHeight = window.innerHeight;

    window.addEventListener('resize', () => {
        // Se a altura diminuir significativamente, provavelmente o teclado virtual está aberto
        if (window.innerHeight < originalHeight * 0.75) {
            document.body.classList.add('keyboard-open');
        } else {
            document.body.classList.remove('keyboard-open');
        }
    });
}

// Inicializa as funções de responsividade
document.addEventListener('DOMContentLoaded', function() {
    // Ajusta o layout inicialmente
    adjustLayout();

    // Adiciona listener para redimensionamento da janela
    window.addEventListener('resize', function() {
        adjustLayout();
        ensureTabsVisibility();
        adjustProductCardHeight();
    });

    // Configura a visibilidade das abas
    ensureTabsVisibility();

    // Ajusta a altura dos cards de produto
    adjustProductCardHeight();

    // Melhora a experiência em dispositivos touch
    enhanceTouchExperience();

    // Lida com o teclado virtual em dispositivos móveis
    handleVirtualKeyboard();

    // Adiciona suporte para orientação em dispositivos móveis
    window.addEventListener('orientationchange', function() {
        // Pequeno atraso para garantir que as dimensões sejam atualizadas
        setTimeout(function() {
            adjustLayout();
            ensureTabsVisibility();
            adjustProductCardHeight();
        }, 200);
    });

    // Adiciona CSS para indicadores de scroll das abas
    const style = document.createElement('style');
    style.textContent = `
        .tabs-container {
            position: relative;
        }
        .tabs-scroll-indicator {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 30px;
            height: 30px;
            background-color: rgba(52, 152, 219, 0.8);
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            z-index: 10;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        .tabs-scroll-indicator.left {
            left: 5px;
        }
        .tabs-scroll-indicator.right {
            right: 5px;
        }
        .tabs-scroll-indicator i {
            color: white;
        }
        .touch-target {
            min-height: 44px;
            min-width: 44px;
        }
        .keyboard-open .products-grid {
            max-height: 40vh;
        }
    `;
    document.head.appendChild(style);
});

// Função para detectar quando um produto é adicionado dinamicamente e ajustar seu layout
function observeProductAddition() {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;

    // Cria um observer para detectar mudanças no DOM
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Novos produtos foram adicionados
                adjustProductCardHeight();

                // Ajusta o tamanho dos ícones e nomes com base na largura da tela
                const width = window.innerWidth;
                const isLandscape = width > window.innerHeight;

                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('product-card')) {
                        const icon = node.querySelector('.product-icon');
                        const name = node.querySelector('.product-name');

                        if (icon) {
                            if (width < 480) {
                                icon.style.fontSize = isLandscape ? '60px' : '50px';
                            } else if (width < 768) {
                                icon.style.fontSize = '70px';
                            } else if (width < 1200) {
                                icon.style.fontSize = '90px';
                            } else {
                                icon.style.fontSize = '120px';
                            }
                        }

                        if (name) {
                            if (width < 480) {
                                name.style.fontSize = '14px';
                            } else if (width < 768) {
                                name.style.fontSize = '16px';
                            } else if (width < 1200) {
                                name.style.fontSize = '18px';
                            } else {
                                name.style.fontSize = '24px';
                            }
                        }
                    }
                });
            }
        });
    });

    // Configura o observer para monitorar adições de filhos
    observer.observe(productsContainer, { childList: true });
}

// Função para ajustar o cabeçalho para diferentes tamanhos de tela
function adjustHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    const width = window.innerWidth;

    // Garante que o cabeçalho esteja configurado como flex
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'center';
    header.style.position = 'relative';

    // Ajusta o título do cabeçalho
    const headerTitle = header.querySelector('.header-title');
    if (headerTitle) {
        headerTitle.style.whiteSpace = 'nowrap';
        headerTitle.style.overflow = 'hidden';
        headerTitle.style.textOverflow = 'ellipsis';
        headerTitle.style.textAlign = 'center';

        // Ajusta o tamanho do título com base na largura da tela
        if (width < 360) {
            headerTitle.style.fontSize = '14px';
            headerTitle.style.maxWidth = '50%';
        } else if (width < 480) {
            headerTitle.style.fontSize = '16px';
            headerTitle.style.maxWidth = '60%';
        } else if (width < 768) {
            headerTitle.style.fontSize = '18px';
            headerTitle.style.maxWidth = '70%';
        } else {
            headerTitle.style.fontSize = '20px';
            headerTitle.style.maxWidth = '80%';
        }
    }

    // Ajusta os ícones do cabeçalho
    const headerIcons = header.querySelectorAll('.icon');
    headerIcons.forEach(icon => {
        icon.style.flexShrink = '0';

        // Ajusta o tamanho dos ícones com base na largura da tela
        if (width < 360) {
            icon.style.fontSize = '20px';
            icon.style.marginRight = '3px';
        } else if (width < 480) {
            icon.style.fontSize = '24px';
            icon.style.marginRight = '5px';
        } else {
            icon.style.fontSize = '28px';
            icon.style.marginRight = '8px';
        }
    });

    // Ajusta o indicador de status de conexão
    const connectionStatus = header.querySelector('.connection-status');
    if (connectionStatus) {
        connectionStatus.style.position = 'absolute';
        connectionStatus.style.right = '5px';
        connectionStatus.style.top = '50%';
        connectionStatus.style.transform = 'translateY(-50%)';

        // Ajusta o tamanho do indicador com base na largura da tela
        if (width < 360) {
            connectionStatus.style.fontSize = '10px';
            connectionStatus.style.padding = '2px 4px';
        } else if (width < 480) {
            connectionStatus.style.fontSize = '12px';
            connectionStatus.style.padding = '3px 5px';
        } else {
            connectionStatus.style.fontSize = '14px';
            connectionStatus.style.padding = '4px 8px';
        }

        // Ajusta o ícone do indicador
        const statusIcon = connectionStatus.querySelector('i');
        if (statusIcon) {
            if (width < 360) {
                statusIcon.style.fontSize = '14px';
                statusIcon.style.marginRight = '2px';
            } else if (width < 480) {
                statusIcon.style.fontSize = '16px';
                statusIcon.style.marginRight = '3px';
            } else {
                statusIcon.style.fontSize = '18px';
                statusIcon.style.marginRight = '4px';
            }
        }
    }
}

// Inicia a observação de adição de produtos quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', observeProductAddition);
