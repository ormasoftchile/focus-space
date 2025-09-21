import * as vscode from 'vscode';
import * as path from 'path';
import { FocusEntry } from '../models/focusEntry';
import { FocusSpaceManager } from '../managers/focusSpaceManager';
import { TreeOperations } from '../utils/treeOperations';

export interface DragConflictResolution {
	action: 'cancel' | 'replace' | 'keepBoth';
	renamePattern?: string;
}

export interface DropTargetInfo {
	targetSection: FocusEntry | null;
	targetIndex?: number;
	parentId?: string;
	isReorder: boolean;
}

export class FocusSpaceDragAndDropController implements vscode.TreeDragAndDropController<FocusEntry> {
	
	// MIME types for drag and drop operations
	readonly dragMimeTypes = ['application/vnd.code.tree.focusspace'];
	readonly dropMimeTypes = ['application/vnd.code.tree.focusspace'];

	constructor(private focusSpaceManager: FocusSpaceManager) {}

	/**
	 * Handle drag operation - prepare data for transfer
	 */
	async handleDrag(
		source: readonly FocusEntry[], 
		dataTransfer: vscode.DataTransfer
	): Promise<void> {
		// Serialize the dragged items
		const dragData = source.map(item => ({
			id: item.id,
			uri: item.uri.toString(),
			label: item.label,
			type: item.type
		}));

		dataTransfer.set(
			'application/vnd.code.tree.focusspace',
			new vscode.DataTransferItem(JSON.stringify(dragData))
		);
	}

	/**
	 * Handle drop operation - process the dropped data
	 */
	async handleDrop(
		target: FocusEntry | undefined,
		dataTransfer: vscode.DataTransfer,
		token: vscode.CancellationToken
	): Promise<void> {
		if (token.isCancellationRequested) {
			return;
		}

		const transferItem = dataTransfer.get('application/vnd.code.tree.focusspace');
		if (!transferItem) {
			return;
		}

		try {
			const dragData = JSON.parse(transferItem.value as string);
			const sourceItems: FocusEntry[] = dragData.map((data: any) => ({
				id: data.id,
				uri: vscode.Uri.parse(data.uri),
				label: data.label,
				type: data.type
			}));

			for (const sourceItem of sourceItems) {
				await this.processSingleDrop(sourceItem, target);
			}

		} catch (error) {
			vscode.window.showErrorMessage(`Failed to process drop operation: ${error}`);
		}
	}

	/**
	 * Process dropping a single item
	 */
	private async processSingleDrop(sourceItem: FocusEntry, target: FocusEntry | undefined): Promise<void> {
		// Handle self-drop (ignore)
		if (target && sourceItem.id === target.id) {
			return;
		}

		// Handle parent-to-child drop (prevent with notification)
		if (target && this.isParentToChildDrop(sourceItem, target)) {
			vscode.window.showWarningMessage(
				`Cannot move "${sourceItem.label}" into its own subdirectory`
			);
			return;
		}

		// Determine the target section and position for the drop
		const dropInfo = this.getDropTargetInfo(sourceItem, target);

		// Check if this is a reorder operation within the same container
		if (dropInfo.isReorder) {
			await this.executeReorderOperation(sourceItem, dropInfo.targetIndex!, dropInfo.parentId);
			return;
		}

		// Check for conflicts in move operations
		const conflictResolution = await this.checkDragConflict(sourceItem, dropInfo.targetSection);
		if (conflictResolution?.action === 'cancel') {
			return;
		}

		// Execute the move operation
		await this.executeMoveOperation(sourceItem, dropInfo.targetSection, dropInfo.targetIndex, conflictResolution);
	}

	/**
	 * Check if this is a parent-to-child drop that should be prevented
	 */
	private isParentToChildDrop(sourceItem: FocusEntry, target: FocusEntry): boolean {
		// Check if target is a descendant of source by walking up the tree
		const allEntries = this.focusSpaceManager.getTopLevelEntries();
		let current = target;
		
		// Walk up the tree to check if source is an ancestor of target
		while (current) {
			const parent = TreeOperations.findParent(allEntries, current.id);
			if (!parent) {
				break;
			}
			
			if (parent.id === sourceItem.id) {
				return true;
			}
			current = parent;
		}
		return false;
	}

	/**
	 * Determine the target section for a drop operation
	 */
	private getTargetSection(target: FocusEntry | undefined): FocusEntry | null {
		if (!target) {
			// Dropping to root level
			return null;
		}

		// If target is a section, drop into it
		if (target.type === 'section') {
			return target;
		}

		// If target is a file, drop into its parent section (or root if no parent)
		const allEntries = this.focusSpaceManager.getTopLevelEntries();
		const parent = TreeOperations.findParent(allEntries, target.id);
		return parent || null;
	}

	/**
	 * Get detailed drop target information including position and reorder detection
	 */
	private getDropTargetInfo(sourceItem: FocusEntry, target: FocusEntry | undefined): DropTargetInfo {
		if (!target) {
			// Dropping to root level at end
			return {
				targetSection: null,
				targetIndex: this.focusSpaceManager.getTopLevelEntries().length,
				isReorder: false
			};
		}

		const allEntries = this.focusSpaceManager.getTopLevelEntries();
		const sourceParent = TreeOperations.findParent(allEntries, sourceItem.id);
		const targetParent = TreeOperations.findParent(allEntries, target.id);

		// If target is a section, drop into it
		if (target.type === 'section') {
			const isReorder = sourceParent?.id === target.id;
			return {
				targetSection: target,
				targetIndex: target.children?.length || 0,
				parentId: target.id,
				isReorder
			};
		}

		// Target is a file - determine if this is reordering or moving
		const targetSection = targetParent;
		const isReorder = (sourceParent?.id === targetParent?.id) || 
		                 (!sourceParent && !targetParent); // both at root

		if (isReorder) {
			// Calculate target index for reordering
			const siblings = targetSection ? targetSection.children! : allEntries;
			const targetIndex = siblings.findIndex(item => item.id === target.id);
			
			return {
				targetSection: targetSection || null,
				targetIndex: targetIndex >= 0 ? targetIndex : siblings.length,
				parentId: targetSection?.id,
				isReorder: true
			};
		} else {
			// Moving to different section
			return {
				targetSection: targetSection || null,
				targetIndex: targetSection ? targetSection.children?.length || 0 : allEntries.length,
				parentId: targetSection?.id,
				isReorder: false
			};
		}
	}

	/**
	 * Execute a reorder operation within the same container
	 */
	private async executeReorderOperation(sourceItem: FocusEntry, targetIndex: number, parentId?: string): Promise<void> {
		try {
			await this.focusSpaceManager.reorderEntry(sourceItem.id, targetIndex, parentId);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to reorder item: ${error}`);
			throw error;
		}
	}

	/**
	 * Check for conflicts when dropping an item
	 */
	private async checkDragConflict(
		sourceItem: FocusEntry,
		targetSection: FocusEntry | null
	): Promise<DragConflictResolution | null> {
		
		// Get the target container's children
		const targetChildren = targetSection ? targetSection.children : this.focusSpaceManager.getTopLevelEntries();
		
		if (!targetChildren) {
			return null;
		}

		// Check if item with same URI already exists in target
		const conflict = targetChildren.find(
			(child: FocusEntry) => child.uri.toString() === sourceItem.uri.toString() && child.id !== sourceItem.id
		);

		if (!conflict) {
			return null;
		}

		// Show dialog for user decision
		const sectionName = targetSection?.label || 'root level';
		const choice = await vscode.window.showWarningMessage(
			`"${path.basename(sourceItem.uri.fsPath)}" already exists in "${sectionName}"`,
			{ modal: true },
			'Cancel',
			'Replace Existing',
			'Keep Both'
		);

		switch (choice) {
			case 'Replace Existing':
				return { action: 'replace' };
			case 'Keep Both':
				return {
					action: 'keepBoth',
					renamePattern: this.generateUniqueName(sourceItem.label || path.basename(sourceItem.uri.fsPath), targetChildren)
				};
			default:
				return { action: 'cancel' };
		}
	}

	/**
	 * Generate a unique name for keeping both items
	 */
	private generateUniqueName(originalLabel: string, existingItems: FocusEntry[]): string {
		let counter = 2;
		const baseName = path.parse(originalLabel).name;
		const extension = path.parse(originalLabel).ext;
		
		while (true) {
			const newName = `${baseName} (${counter})${extension}`;
			if (!existingItems.some(item => item.label === newName)) {
				return newName;
			}
			counter++;
		}
	}

	/**
	 * Execute the actual move operation
	 */
	private async executeMoveOperation(
		sourceItem: FocusEntry,
		targetSection: FocusEntry | null,
		targetIndex?: number,
		conflictResolution?: DragConflictResolution | null
	): Promise<void> {
		
		try {
			// Handle conflict resolution
			if (conflictResolution?.action === 'replace') {
				// Remove the existing conflicting item first
				const targetChildren = targetSection ? targetSection.children : this.focusSpaceManager.getTopLevelEntries();
				const conflictingItem = targetChildren?.find(
					(child: FocusEntry) => child.uri.toString() === sourceItem.uri.toString() && child.id !== sourceItem.id
				);
				if (conflictingItem) {
					await this.focusSpaceManager.removeEntry(conflictingItem.id);
				}
			}

			// Use new moveToSectionWithPosition method for position control
			if (targetIndex !== undefined) {
				await this.focusSpaceManager.moveToSectionWithPosition(sourceItem.id, targetSection?.id, targetIndex);
			} else {
				// Fallback to regular move
				await this.focusSpaceManager.moveToSection(sourceItem.id, targetSection?.id);
			}

			// Handle keep both scenario by updating the label after move
			if (conflictResolution?.action === 'keepBoth' && conflictResolution.renamePattern) {
				// Note: For keepBoth, we would need additional logic to rename the item
				// This is a simplified implementation that doesn't handle the rename yet
				vscode.window.showInformationMessage(`Moved "${sourceItem.label}" (rename functionality pending)`);
			}

		} catch (error) {
			vscode.window.showErrorMessage(`Failed to move item: ${error}`);
			// Re-throw to allow caller to handle
			throw error;
		}
	}
}