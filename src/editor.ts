import * as vscode from 'vscode';

export function openVisualEditor(context: vscode.ExtensionContext) {

	const editor = vscode.window.activeTextEditor;
	if (editor) {

		let panel = EditorPanel.findPanelByDocument(editor.document);
		if (panel) {
			panel.panel.reveal();
		}
		else {
			new EditorPanel(editor.document, context);
		}
	}
}

export function backToFile(context: vscode.ExtensionContext) {
	if (EditorPanel.currentPanel) {
		EditorPanel.currentPanel.backToFile();
	} else {
		vscode.window.showErrorMessage(`Frame7 Web Visual Editor Window not open.\n
			This is an extension bug.`);
	}
}

export class EditorPanel {
	public readonly panel: vscode.WebviewPanel;
	private document: vscode.TextDocument;
	private readonly context: vscode.ExtensionContext;

	public static panels: EditorPanel[] = [];
	public static currentPanel: EditorPanel | undefined = undefined;

	public static readonly viewType =
		'frame7-web.VisualEditor'

	public constructor(
		document: vscode.TextDocument,
		context: vscode.ExtensionContext
	) {
		this.document = document;
		this.context = context;
		this.panel = EditorPanel.createPanel(this.context.extensionUri);

		this.panel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'change':
					this.editTextDocument(e.text);
					break;
				case 'retrieve':
					this.update('retrieve');
					break;
				case 'error':
					vscode.window.showErrorMessage(e.message);
					break;
			}
		});

		this.panel.onDidChangeViewState(_ => { this.handleViewStateChange(); });
		this.handleViewStateChange();

		const changeDocumentEvent =
			vscode.workspace.onDidChangeTextDocument(e => {
				if (e.document.uri.fsPath === this.document.uri.fsPath) {
					this.document = e.document;
					this.update('change');
				}
			});

		const closeDocumentEvent =
			vscode.workspace.onDidCloseTextDocument(e => {
				if (e === this.document) {
					if (vscode.workspace.getConfiguration(
						'frame7-web'
					).get(
						'closeVisualEditorWithDocument'
					)) {
						this.panel.dispose();
					}
				}
			});

		const saveDocumentEvent =
			vscode.workspace.onDidSaveTextDocument(e => {
				if (e === this.document) {
					this.update('save');
				}
			});

		this.panel.onDidDispose(() => {
			this.dispose();
			changeDocumentEvent.dispose();
			closeDocumentEvent.dispose();
			saveDocumentEvent.dispose();
		});

		EditorPanel.panels.push(this);
	}

	private static getActiveColumn(): vscode.ViewColumn {
		const config = vscode.workspace.getConfiguration('frame7-web')
			.get<string>('visualEditorColumn') || "active";
		switch (config) {
			case 'active':
				return vscode.ViewColumn.Active;
			case 'beside':
				return vscode.ViewColumn.Beside;
			case 'one':
				return vscode.ViewColumn.One;
			case 'two':
				return vscode.ViewColumn.Two;
			case 'three':
				return vscode.ViewColumn.Three;
			case 'four':
				return vscode.ViewColumn.Four;
			case 'five':
				return vscode.ViewColumn.Five;
			case 'six':
				return vscode.ViewColumn.Six;
			case 'seven':
				return vscode.ViewColumn.Seven;
			case 'eight':
				return vscode.ViewColumn.Eight;
			case 'nine':
				return vscode.ViewColumn.Nine;
			default:
				return vscode.ViewColumn.Active;
		}
	}

	public dispose(): void {
		this.panel.dispose();
		this.removeFromPanels();
	}

	public static findPanelByDocument(document: vscode.TextDocument) {
		return this.panels.find(x => x.document === document);
	}

	public backToFile(): void {
		if (this.document.isClosed) {
			vscode.workspace.openTextDocument(this.document.uri).then(e => {
				this.document = e;
				vscode.window.showTextDocument(this.document);
			});
		}
		else {
			vscode.window.showTextDocument(this.document);
		}
	}

	private static createPanel(extensionUri: vscode.Uri): vscode.WebviewPanel {
		const column = EditorPanel.getActiveColumn();

		const panel = vscode.window.createWebviewPanel(
			EditorPanel.viewType,
			'Frame7 Web UI Visual Editor',
			column,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);
		this.openHtml(extensionUri, panel.webview).then(html => {
			panel.webview.html = html;
		});
		return panel;
	}


	private removeFromPanels() {
		let panels = EditorPanel.panels;
		let index = panels.findIndex(x => x === this);
		panels[index] = panels[panels.length - 1];
		panels.pop();
	}

	private update(updateType: string): void {
		this.panel.webview.postMessage({
			type: 'update',
			updateType: updateType,
			text: this.document.getText(),
		});
	}

	private static openHtml(
		extensionUri: vscode.Uri, webview: vscode.Webview
	): Thenable<string> {
		const indexUri =
			vscode.Uri.joinPath(extensionUri, 'media', 'index.html');
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, 'media', 'style.css')
		);
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, 'media', 'script.js')
		);

		return vscode.workspace.openTextDocument(indexUri).then(document => {
			const iframeContentUri = vscode.Uri.parse(
				vscode.workspace.getConfiguration('frame7-web')
					.get<string>('visualEditorUri') || "",
				true
			);
			if (!iframeContentUri) {
				vscode.window.showErrorMessage(
					'Could not get uri of visual editor.'
				);
				return 'Could not get URI of visual editor.';
			}
			return document.getText()
				.replace("$styleUri", styleUri.toString())
				.replace("$scriptUri", scriptUri.toString())
				.replace("$iframeContentUri", iframeContentUri.toString());
		});
	}

	private editTextDocument(text: string) {
		const edit = new vscode.WorkspaceEdit();

		edit.replace(
			this.document.uri,
			new vscode.Range(0, 0, this.document.lineCount, 0),
			text,
		);
		return vscode.workspace.applyEdit(edit);
	}

	private handleViewStateChange() {
		if (this.panel.active) {
			EditorPanel.currentPanel = this;
		}
		else {
			if (this === EditorPanel.currentPanel) {
				EditorPanel.currentPanel = undefined;
			}
		}
	}
}

