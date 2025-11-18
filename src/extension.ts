import * as vscode from 'vscode';
import { openVisualEditor, backToFile, undo } from './editor';

export function activate(context: vscode.ExtensionContext) {
	console.log('activated');
	context.subscriptions.push(vscode.commands.registerCommand(
		'frame7-web.openVisualEditor',
		() => { openVisualEditor(context) }
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'frame7-web.backToFile',
		() => { backToFile(context) }
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'undo',
		() => { undo(context) }
	))
}

export function deactivate() { }
