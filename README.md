# NOTE
While you are free to use this extension however you see fit, I originally made it for personal use, so it may be buggy or may not work for you. At the moment, it's not something I plan to release officially. However, if you do use it and find issues, feel free to reach out to me. Otherwise, you are welcome to fork and modify it as needed, just don't forget the plugin as well.

To set expectations: this was 100% vibe-coded using Kiro and Claude Opus. I know I don't use `getContext` as well as I could; I learned about that after most of the code was written and didn't feel like refactoring everything.

> Currently DOES NOT support group chats

# Welcome to Chat Branches

A SillyTavern extension that brings powerful branching conversation management to your character chats. Visualize, navigate, and manage chat branches with an intuitive tree interface.

## Overview

Chat Branches injects UUIDs into chat metadata to form branch trees for the current chat, building hierarchical parent-child relationships between conversations. This allows you to:

- **Visualize** your chat history as an interactive tree diagram
- **Navigate** between branches with a simple double-click
- **Manage** chat names with inline editing
- **View** message history from any branch without switching chats

## Requirements

This extension requires a companion server plugin to function. The plugin acts as a high-performance bridge between the extension and SillyTavern's storage.

### Why a Plugin is Needed

SillyTavern uses the Windows filesystem to store chats as individual `.jsonl` files. When building a branch tree, the extension needs to quickly look up chat metadata (UUIDs, parent relationships, etc.) across potentially hundreds of chat files. Reading and parsing each file through the filesystem would be extremely slow.

The server plugin solves this by:
- Using **node-persist** as a fast key-value store that sits alongside SillyTavern's chat files
- Maintaining indexed mappings (by character, by root UUID, by branch UUID) for instant lookups
- Acting as a bridge between the extension and the filesystem - the plugin handles the heavy lifting while the extension makes simple API calls
- Providing O(1) access to branch relationships instead of O(n) filesystem scans

In short: the plugin makes the tree view load in milliseconds instead of seconds (or longer with large chat histories).

**[Server Plugin Repository](https://github.com/spaceman2408/chat-branches-plugin)**

## Installation

### Extension
1. Open SillyTavern
2. Go to **Extensions → Install Extension**
3. Enter: `https://github.com/spaceman2408/SillyTavern-ChatBranches`

### Server Plugin
1. Install the server plugin from the repository linked above
2. Restart your SillyTavern server

## Features

### Interactive Tree View
- **Visual Branch Hierarchy**: See all your chat branches as a connected tree diagram
- **Current Chat Highlighting**: Active chat is clearly marked in the tree
- **Expand/Collapse Nodes**: Control which branches are visible
- **Pan & Navigate**: Click and drag to pan around large trees
- **Root Switching**: Jump between different root conversations via dropdown

### Chat Navigation
- **Double-click to Switch**: Quickly jump to any branch
- **Context Menu**: Right-click (or long-press on mobile) for options:
  - View Messages
  - Expand/Collapse All Nodes
  - Find Current Node

### Message Viewer
- **Preview Without Switching**: View messages from any branch without leaving your current chat
- **Swipe Navigation**: Browse through message swipes/variations
- **Click to Jump**: Click any message to navigate directly to it
- **Expand Long Messages**: Truncated messages can be expanded for full viewing

### Chat Management
- **Inline Rename**: Click the pencil icon to rename chats directly in the tree
- **Validation**: Prevents duplicate names and invalid characters
- **UUID Preservation**: Metadata is maintained across renames

### Storage Rebuild
- **Repair Corrupted Data**: Rebuild plugin storage from existing chat files
- **UUID Recovery**: Recovers branch relationships from chats that already have UUIDs
- **Batch Processing**: Handles large chat histories efficiently

## Usage

### Opening the Tree View
- Click the **Chat Branches** button in the options menu (hamburger icon)
- Or click the sitemap icon on any message (to the left of the branch icon)

### Creating Branches
- Use the standard "Create Branch" button on messages
- Branches are automatically tracked with UUIDs

### Renaming Chats
1. Click the pencil icon next to any chat name in the tree
2. Enter the new name
3. Press Enter or click the checkmark to confirm

### Viewing Messages
1. Right-click (or long-press) any node in the tree
2. Select "View Messages"
3. Browse messages and click to jump to any specific message

## Settings

Access settings via **Extensions → Chat Branches**:

- **Enable Extension**: Toggle the extension on/off
- **Rebuild Storage**: Rebuild plugin storage from chat files (useful for recovery)

## Limitations

- **Group Chats**: Not currently supported
- **Checkpoints**: Checkpoint/bookmark chats are excluded from branch tracking
- **Plugin Required**: Cannot function without the server plugin

## Screenshots

### Tree View
![](https://i.imgur.com/59Sqy7G.png)

### Message Viewer
![](https://i.imgur.com/r4HY3G9.png)

## Technical Details

### File Structure
```
SillyTavern-ChatBranches/
├── index.js                 # Main extension entry point
├── manifest.json            # Extension manifest
├── index.html               # Settings panel UI
├── src/
│   ├── ChatTreeView.js      # Tree visualization component
│   ├── ChatRenameHandler.js # Chat renaming logic
│   ├── MessageViewerPopup.js # Message preview component
│   ├── StorageRebuilder.js  # Storage recovery tool
│   ├── ContextMenu.js       # Context menu component
│   └── css/
│       ├── styles.css       # Main styles
│       ├── chat-tree-view.css    # Tree view styles
│       └── message-viewer-popup.css # Message viewer styles
```

### UUID Metadata
The extension stores branch relationships in chat metadata:
- `uuid`: Unique identifier for the chat
- `parent_uuid`: UUID of the parent chat (null for root chats)
- `root_uuid`: UUID of the root chat in the branch tree

## Troubleshooting

### Plugin Not Detected
If you see "Plugin is required for this extension to work":
1. Ensure the server plugin is installed
2. Restart your SillyTavern server
3. Refresh the browser

### Missing Branches
If branches aren't appearing:
1. Open the Chat Branches settings
2. Click "Rebuild Storage"
3. This will scan existing chats and rebuild the tree

### Rename Failures
If renaming fails:
- Check for duplicate names
- Avoid special characters: `< > : " / \ | ? *`
- Names cannot start with dots or spaces