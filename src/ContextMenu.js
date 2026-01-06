/**
 * ContextMenu - Lightweight context menu component for right-click interactions
 * Displays options when user right-clicks on tree nodes
 *
 * @ts-expect-error - Using deprecated jQuery .on() method with string-based namespaced events.
 * This is necessary for proper event namespace cleanup and is safe in this context.
 */

// Z-index constants for proper layering
export const Z_INDEX = {
    TREE_VIEW_OVERLAY: 9999,
    MESSAGE_VIEWER_OVERLAY: 10001,
    CONTEXT_MENU: 10002
};

export class ContextMenu {
    constructor() {
        this.element = null;
        this.onSelectCallback = null;
        this.boundHideOnClickOutside = this.hideOnClickOutside.bind(this);
        this.boundHideOnScroll = this.hide.bind(this);
        this.boundHideOnKeydown = this.hideOnKeydown.bind(this);
        this.isDestroyed = false;
        this.showTimestamp = 0; // Track when menu was last shown to prevent immediate hide
    }

    /**
     * Show the context menu at specified position with given options
     * @param {number} x - X coordinate for menu position
     * @param {number} y - Y coordinate for menu position
     * @param {Array<{id: string, label: string, icon?: string}>} options - Menu options to display
     */
    show(x, y, options) {
        if (this.isDestroyed) return;
        
        try {
            // Force cleanup any existing menu without triggering hide logic
            this.forceCleanup();
            
            // Set timestamp to prevent immediate hide after showing
            this.showTimestamp = Date.now();

            // Validate inputs
            if (!isFinite(x) || !isFinite(y)) {
                console.warn('ContextMenu: Invalid coordinates, using fallback');
                x = 100;
                y = 100;
            }
            
            if (!Array.isArray(options) || options.length === 0) {
                console.warn('ContextMenu: No options provided');
                return;
            }

            const menuHtml = this.buildMenuHtml(options);
            this.element = $(menuHtml);
            $('body').append(this.element);

            // Position the menu
            this.positionMenu(x, y);

            // Bind option click handlers
            this.element.find('.context-menu-option').on('click', (e) => {
                try {
                    const optionId = $(e.currentTarget).data('option-id');
                    if (this.onSelectCallback && typeof this.onSelectCallback === 'function') {
                        this.onSelectCallback(optionId);
                    }
                    this.hide();
                } catch (clickError) {
                    console.error('ContextMenu: Error handling option click:', clickError);
                    this.hide();
                }
            });

            // Bind close handlers
            $(document).on('click.contextMenu', this.boundHideOnClickOutside);
            $(document).on('keydown.contextMenu', (e) => this.boundHideOnKeydown(e));
            $('#chat_tree_content').on('scroll.contextMenu', this.boundHideOnScroll);

            // Show with animation
            this.element.addClass('visible');
        } catch (error) {
            console.error('ContextMenu: Error showing menu:', error);
            this.forceCleanup();
        }
    }
    
    /**
     * Force cleanup of context menu elements
     */
    forceCleanup() {
        try {
            $('.chat-branches-context-menu').remove();
            $(document).off('click.contextMenu');
            $(document).off('contextmenu.contextMenu');
            $(document).off('keydown.contextMenu');
            $('#chat_tree_container').off('scroll.contextMenu');
            this.element = null;
        } catch (e) {
            console.error('ContextMenu: Force cleanup failed:', e);
        }
    }

    /**
     * Build HTML for the context menu
     * @param {Array<{id: string, label: string, icon?: string}>} options
     * @returns {string} HTML string
     */
    buildMenuHtml(options) {
        try {
            const optionsHtml = options.map(option => {
                // Sanitize option data
                const id = this.escapeHtml(String(option.id || ''));
                const label = this.escapeHtml(String(option.label || 'Option'));
                const iconHtml = option.icon ? `<i class="${this.escapeHtml(option.icon)}"></i>` : '';
                return `
                    <div class="context-menu-option" data-option-id="${id}">
                        ${iconHtml}
                        <span>${label}</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="chat-branches-context-menu">
                    ${optionsHtml}
                </div>
            `;
        } catch (error) {
            console.error('ContextMenu: Error building menu HTML:', error);
            return '<div class="chat-branches-context-menu"></div>';
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Position the menu, ensuring it stays within viewport
     * @param {number} x - Desired X position
     * @param {number} y - Desired Y position
     */
    positionMenu(x, y) {
        if (!this.element) return;

        try {
            const menuWidth = this.element.outerWidth() || 160;
            const menuHeight = this.element.outerHeight() || 40;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Adjust position if menu would overflow viewport
            let finalX = x;
            let finalY = y;

            if (x + menuWidth > viewportWidth - 10) {
                finalX = viewportWidth - menuWidth - 10;
            }
            if (y + menuHeight > viewportHeight - 10) {
                finalY = viewportHeight - menuHeight - 10;
            }

            // Ensure minimum position
            finalX = Math.max(10, finalX);
            finalY = Math.max(10, finalY);
            
            // Validate final positions
            if (!isFinite(finalX) || !isFinite(finalY)) {
                finalX = 100;
                finalY = 100;
            }

            this.element.css({
                left: finalX + 'px',
                top: finalY + 'px'
            });
        } catch (error) {
            console.error('ContextMenu: Error positioning menu:', error);
            // Fallback position
            this.element.css({
                left: '100px',
                top: '100px'
            });
        }
    }

    /**
     * Hide the context menu
     */
    hide() {
        try {
            if (this.element) {
                this.element.removeClass('visible');
                setTimeout(() => {
                    try {
                        if (this.element) {
                            this.element.remove();
                            this.element = null;
                        }
                    } catch (e) {
                        console.error('ContextMenu: Error during delayed cleanup:', e);
                        $('.chat-branches-context-menu').remove();
                        this.element = null;
                    }
                }, 150);
            }

            // Remove event listeners
            $(document).off('click.contextMenu');
            // $(document).off('contextmenu.contextMenu');
            $(document).off('keydown.contextMenu');
            $('#chat_tree_content').off('scroll.contextMenu');
        } catch (error) {
            console.error('ContextMenu: Error hiding menu:', error);
            this.forceCleanup();
        }
    }

    /**
     * Hide menu when clicking outside
     * @param {Event} e - Click event
     */
    hideOnClickOutside(e) {
        try {
            if (!(e.target instanceof HTMLElement)) {
                return;
            }
            // Return early if menu is already hidden (element is null)
            if (!this.element) {
                return;
            }
            // Check if click is inside the context menu
            if (this.element.is(e.target) || this.element.has(e.target).length > 0) {
                return;
            }
            // Prevent immediate hide after showing (within 200ms)
            // This prevents the menu from hiding when the right-click that triggered it
            // also triggers the click handler
            const timeSinceShow = Date.now() - this.showTimestamp;
            if (timeSinceShow < 200) {
                return;
            }
            // Hide if click is outside
            this.hide();
        } catch (error) {
            console.error('ContextMenu: Error in hideOnClickOutside:', error);
            this.hide();
        }
    }

    /**
     * Hide menu when Escape key is pressed
     * @param {JQuery.Event} e - jQuery event object
     */
    hideOnKeydown(e) {
        try {
            // jQuery event has .which or .keyCode for key detection
            // Use e.originalEvent for native KeyboardEvent properties if needed
            if (e.key === 'Escape' || e.which === 27) {
                this.hide();
            }
        } catch (error) {
            console.error('ContextMenu: Error in hideOnKeydown:', error);
            this.forceCleanup();
        }
    }

    /**
     * Register callback for option selection
     * @param {Function} callback - Function to call with selected option id
     */
    onOptionSelect(callback) {
        if (typeof callback === 'function') {
            this.onSelectCallback = callback;
        }
    }

    /**
     * Check if context menu is currently visible
     * @returns {boolean}
     */
    isVisible() {
        try {
            return this.element !== null && this.element.hasClass('visible');
        } catch (error) {
            return false;
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.isDestroyed = true;
        try {
            this.hide();
            this.onSelectCallback = null;
        } catch (error) {
            console.error('ContextMenu: Error during destroy:', error);
            this.forceCleanup();
            this.onSelectCallback = null;
        }
    }
}
