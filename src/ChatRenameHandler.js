/**
 * ChatRenameHandler - Handles rename functionality for chat branches
 * Manages validation, plugin updates, and file renaming operations
 */

export class ChatRenameHandler {
    constructor(dependencies) {
        this.token = dependencies.token;
        this.pluginBaseUrl = dependencies.pluginBaseUrl;
        this.characters = dependencies.characters;
        this.this_chid = dependencies.this_chid;
        
        // Windows filesystem constraints
        this.INVALID_CHARS = /[<>:"/\\|?*]/g;
        this.RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
        this.MAX_FILENAME_LENGTH = 255;
    }

    /**
     * Validate name against constraints
     * @param {string} newName - The proposed new name
     * @param {Array} treeRoots - Array of tree root nodes for duplicate checking
     * @param {string} excludeUuid - UUID of the node being renamed (to exclude from duplicate check)
     * @returns {Object} Validation result { valid: boolean, error: string }
     */
    validateName(newName, treeRoots, excludeUuid = null) {
        // Check empty name
        if (!newName || newName.trim().length === 0) {
            return { valid: false, error: 'Chat name cannot be empty' };
        }

        const trimmedName = newName.trim();

        // Check length
        if (trimmedName.length > this.MAX_FILENAME_LENGTH) {
            return { 
                valid: false, 
                error: `Name too long (max ${this.MAX_FILENAME_LENGTH} characters)` 
            };
        }

        // Check invalid characters
        if (this.INVALID_CHARS.test(trimmedName)) {
            return { 
                valid: false, 
                error: 'Name contains invalid characters: < > : " / \\ | ? *' 
            };
        }

        // Check reserved names
        if (this.RESERVED_NAMES.test(trimmedName)) {
            return { valid: false, error: 'Name is reserved by the system' };
        }

        // Check for duplicates in tree
        if (this.hasDuplicateName(trimmedName, treeRoots, excludeUuid)) {
            return { valid: false, error: 'A chat with this name already exists' };
        }

        return { valid: true };
    }

    /**
     * Check if a name already exists in the tree (excluding the current node)
     * @param {string} newName - The proposed new name
     * @param {Array} treeRoots - Array of tree root nodes
     * @param {string} excludeUuid - UUID to exclude from duplicate check
     * @returns {boolean} True if duplicate exists
     */
    hasDuplicateName(newName, treeRoots, excludeUuid) {
        for (const root of treeRoots) {
            if (this.checkNodeForDuplicate(root, newName, excludeUuid)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Recursively check a node and its children for duplicate name
     * @param {Object} node - Node to check
     * @param {string} newName - Name to check for
     * @param {string} excludeUuid - UUID to exclude
     * @returns {boolean} True if duplicate found
     */
    checkNodeForDuplicate(node, newName, excludeUuid) {
        if (node.id !== excludeUuid && node.name === newName) {
            return true;
        }
        if (node.children && node.children.length > 0) {
            return node.children.some(child => 
                this.checkNodeForDuplicate(child, newName, excludeUuid)
            );
        }
        return false;
    }

    /**
     * Update branch in plugin storage
     * @param {string} uuid - Branch UUID
     * @param {string} newName - New chat name
     * @returns {Promise<void>}
     */
    async updateBranchInPlugin(uuid, newName) {
        const stringName = String(newName);

        const response = await fetch(`${this.pluginBaseUrl}/branch/${uuid}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.token
            },
            body: JSON.stringify({ chat_name: stringName })
        });

        if (!response.ok) {
            throw new Error(`Plugin request failed: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Plugin returned error');
        }
    }

    /**
     * Rename actual chat file in SillyTavern
     * Uses the built-in /api/chats/rename endpoint
     * @param {string} oldName - Current chat name (without .jsonl extension)
     * @param {string} newName - New chat name (without .jsonl extension)
     * @returns {Promise<string|null>} Returns sanitized name if provided by server, null otherwise
     */
    async renameChatFile(oldName, newName) {
        if (!this.characters || this.this_chid === undefined || this.this_chid === null) {
            throw new Error('Character not found');
        }

        const character = this.characters[this.this_chid];
        if (!character) {
            throw new Error('Character not found');
        }

        const stringOldName = String(oldName);
        const stringNewName = String(newName).trim();

        // Use SillyTavern's built-in rename API
        const body = {
            is_group: false,
            avatar_url: character.avatar,
            original_file: `${stringOldName}.jsonl`,
            renamed_file: `${stringNewName}.jsonl`,
        };

        console.log('[ChatRenameHandler] Sending rename request:', body);

        const response = await fetch('/api/chats/rename', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.token
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            let errorDetails = '';
            try {
                const errorData = await response.json();
                errorDetails = errorData.error || errorData.message || JSON.stringify(errorData);
            } catch (e) {
                errorDetails = await response.text();
            }
            console.error('[ChatRenameHandler] Rename API error:', response.status, errorDetails);
            const errorString = String(errorDetails);
            
            if (errorString === 'true' || errorString.toLowerCase().includes('already exists')) {
                throw new Error('A chat with this name already exists');
            } else if (errorString.toLowerCase().includes('not found')) {
                throw new Error('Chat file not found');
            } else {
                throw new Error(`Rename failed: ${errorString}`);
            }
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error || 'Server returned an error');
        }

        console.log('[ChatRenameHandler] Rename successful:', data);

        // Return sanitized filename if provided by server
        return data.sanitizedFileName || null;
    }

    /**
     * Main rename orchestration
     * @param {string} uuid - Branch UUID
     * @param {string} oldName - Current chat name
     * @param {string} newName - New chat name
     * @returns {Promise<void>}
     */
    async performRename(uuid, oldName, newName) {
        try {
            // Step 1: Update plugin storage
            await this.updateBranchInPlugin(uuid, newName);

            // Step 2: Rename the actual chat file
            await this.renameChatFile(oldName, newName);

            // Success
            return;
        } catch (error) {
            console.error('[ChatRenameHandler] Rename failed:', error);
            throw new Error(error.message || 'Failed to rename chat');
        }
    }

    /**
     * Update dependencies (needed because this_chid may change)
     * @param {Object} dependencies - Updated dependencies
     */
    updateDependencies(dependencies) {
        if (dependencies.token !== undefined) this.token = dependencies.token;
        if (dependencies.pluginBaseUrl !== undefined) {
            this.pluginBaseUrl = dependencies.pluginBaseUrl;
        }
        if (dependencies.characters !== undefined) {
            this.characters = dependencies.characters;
        }
        if (dependencies.this_chid !== undefined) {
            this.this_chid = dependencies.this_chid;
        }
    }
}