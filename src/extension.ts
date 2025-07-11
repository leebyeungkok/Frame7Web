import * as vscode from 'vscode';
import { openVisualEditor, backToFile as backToFile } from './editor';

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
}

export function deactivate() { }
