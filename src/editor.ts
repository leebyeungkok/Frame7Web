import * as vscode from 'vscode';
import * as fs from "fs";   

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
		vscode.window.showErrorMessage(`Visual Editor Window not open.\n
			This is an extension bug.`);
	}
}

export function undo(context: vscode.ExtensionContext){
	if (EditorPanel.currentPanel) {
		EditorPanel.currentPanel.undo();
	}
}
/*
const getFileList = async (path: string) => {
	let strRootPath:string = vscode.workspace.workspaceFolders[0].uri.fsPath;
	let list:object[] = [];
	let obj = {list: list};
	let seperator:string = '';
	if(path == ''){	
		seperator = '';
	} else {
		seperator = '/';
	}
	const uri:string = vscode.Uri.file(strRootPath + seperator + path);
	const entries:string[] = await vscode.workspace.fs.readDirectory(uri);
	entries.forEach(([name, type]) => {
		const entryType = type === vscode.FileType.Directory ? 'd' : 'f';
		if( path == '' && (name == 'assets' || name == '.vscode' ||  name == 'editor' || name == 'lib' )){

		} else {
			list.push({'parent':path, fileUri: name, type:entryType});
		}
	});
	return list;
}
*/

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
		// 이시형
		let fileName = this.getFileName(this.document.uri.path) + ' Designer';


		this.panel = EditorPanel.createPanel(fileName, this.context.extensionUri);

		this.panel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'change': // WebView->here 
					console.log('change...');
					this.editTextDocument(e.text);
					break; 
				case 'writeFile':
					this.writeFile(e.text);
					break;
				case 'writeDiagram':
					this.writeDiagramFile(e.text);
					break;
				case 'writeDiagramTemplate':
					this.writeDiagramTemplateFile(e.text);
					break;
				case 'writeDiagramComponent':
					this.writeDiagramComponentFile(e.text);
					break;				
				case 'retrieve':
					this.update('retrieve');
					break;
				case 'readFileList':
					this.readFileList();
					break;
				case 'error':
					vscode.window.showErrorMessage(e.message);
					break;
			}
		});

		this.panel.onDidChangeViewState(_ => { this.handleViewStateChange(); });
		this.handleViewStateChange();

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
		//here to Webview;
		const saveDocumentEvent =
			vscode.workspace.onDidSaveTextDocument(e => {
				if (e.uri.fsPath === this.document.uri.fsPath) {
					this.update('save');
				}
			});

		this.panel.onDidDispose(() => {
			this.dispose();
			//changeDocumentEvent.dispose();
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
	public getFileName(path:string): string{
		if(path.indexOf('/') != -1){
			let lastIndex = path.lastIndexOf('/');
			let fileName = path.substring(lastIndex+1);
			return fileName;

		} else if(path.indexOf('\\')!= -1){
			let lastIndex = path.lastIndexOf('\\');
			let fileName = path.substring(lastIndex+1);
			return fileName;
		} else {
			return path;
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

	public undo() : void {
		this.panel.webview.postMessage({
			type: 'commmand',
			command: 'undo',
		})
	}

	private static createPanel(panelName: string, extensionUri: vscode.Uri): vscode.WebviewPanel {
		const column = EditorPanel.getActiveColumn();
		
		const panel = vscode.window.createWebviewPanel(
			EditorPanel.viewType,
			//'Frame7Web UI Editor',
			panelName,
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
		console.log('updateType', updateType);
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
			console.log('>>iframeContentUri', iframeContentUri);
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
	private getCurrentFilePath() : string{
		let str = vscode.window.activeTextEditor?.document.uri.fsPath;
		if(str === undefined){
			str = '';
		}
		return str;
	}
	private async readFileList(){		
		let strFileList = '';
		/*
		try{
			if (vscode.workspace.workspaceFolders) {
				
				//console.log('조립시작')

				let path = '';
				const loopFileList = async () => {
					let list:object[] = [];					
					list = await getFileList(path);
					console.log('list', list);
					for(let i=0; i < list.length; i++){
						if(list[i].type == 'd'){
							let dirName1:string = list[i].parent + '/' + list[i].fileUri;
							console.log('dirName1', dirName1);
							let listSub1:object[] = await getFileList(dirName1);
							for(let j=0; j < listSub1.length; j++){
								console.log('j', j, listSub1[j]);
								list.push(listSub1[j]);
								if(listSub1[j].type == 'd'){
									let dirName2:string = listSub1[j].parent + '/' + listSub1[j].fileUri;
									console.log('dirName2', dirName2);
									let listSub2:object[] = await getFileList(dirName2);
									
									for(let k=0; k < listSub2.length; k++){
										console.log('k', k, listSub2[k]);
										list.push(listSub2[k])
										if(listSub2[k].type == 'd'){
											let dirName3:string = listSub2[k].parent + '/'  + listSub2[k].fileUri;
											console.log('dirName3', dirName3);
											let listSub3:object[] = await getFileList(dirName3);
											for(let l=0; l < listSub3.length; l++){
												console.log('l', l, listSub3[l]);
												list.push(listSub3[l])
											}
										}											
									}									
								}								
							}
						}
					}
					//console.log('list', list);
					let obj = {list: list};
					this.panel.webview.postMessage({
						type: 'update',
						updateType: 'readFileList',
						text: JSON.stringify(obj)
					});
				}
				loopFileList();
			}
 		} catch (error) {
			console.log('error...................', error);
            vscode.window.showErrorMessage(`Error getting file info: ${error}`);
        }
		*/
	}
	private writeFile(text:string){
		console.log('0text=>', text);
		let firstIndex = text.indexOf(':');
		let filename = text.substring(0, firstIndex);
		let content = text.substring(firstIndex + 1);
		const fs = require('fs');
		var filePath = vscode.workspace.rootPath  + filename;
		fs.writeFileSync(filePath, content, 'utf8');

		var openPath = vscode.Uri.parse("file:///" + filePath); //A request file path
		//vscode.workspace.openTextDocument(openPath).then(doc => {
		//	vscode.window.showTextDocument(doc);
		//});
	}
	private writeDiagramFile(text:string){
		console.log('1text=>', text);
		let firstIndex = text.indexOf(':');
		let filename = text.substring(0, firstIndex);
		let content = text.substring(firstIndex + 1);
		const fs = require('fs');
		var filePath = vscode.workspace.rootPath  +  filename.substring(1);
		fs.writeFileSync(filePath, content, 'utf8');

		console.log('filePath', filePath, content);

		var openPath = vscode.Uri.parse("file:///" + filePath); //A request file path
		//vscode.workspace.openTextDocument(openPath).then(doc => {
		//	vscode.window.showTextDocument(doc);
		//});
	}
	private writeDiagramTemplateFile(text:string){
		console.log('2text=>', text);
		let firstIndex = text.indexOf(':');
		let pathfilename = text.substring(0, firstIndex);
		let path = pathfilename.substring(0,4);
		let filename = pathfilename.substring(4, 8) + '.json';

		let content = text.substring(firstIndex + 1);
		const fs = require('fs');
		var filePath = vscode.workspace.rootPath  + '/editor/diagramtemplate/' + path +  '/' + filename;

		console.log('filepath-->', filePath);
		console.log('content-->', content);
		fs.writeFileSync(filePath, content, 'utf8');

		var openPath = vscode.Uri.parse("file:///" + filePath); //A request file path
		//vscode.workspace.openTextDocument(openPath).then(doc => {
		//	vscode.window.showTextDocument(doc);
		//});
	}		
	private writeDiagramComponentFile(text:string){
		console.log('3text=>', text);
		let firstIndex = text.indexOf(':');
		let pathfilename = text.substring(0, firstIndex);
		let path = pathfilename.substring(0,4);
		let filename = pathfilename.substring(4, 8) + '.json';

		let content = text.substring(firstIndex + 1);
		const fs = require('fs');
		var filePath = vscode.workspace.rootPath  + '/editor/diagram/' + path +  '/' + filename;

		console.log('filepath-->', filePath);
		console.log('content-->', content);
		fs.writeFileSync(filePath, content, 'utf8');

		var openPath = vscode.Uri.parse("file:///" + filePath); //A request file path
		//vscode.workspace.openTextDocument(openPath).then(doc => {
		//	vscode.window.showTextDocument(doc);
		//});
	}	
	private editTextDocument(text: string) {
		const edit = new vscode.WorkspaceEdit();
		console.log('text==>', text);
		let currentText = this.document.getText();
		if(	currentText.indexOf('/**designweb____editor_start**/') != -1 && 
			currentText.indexOf('/**designweb____editor_end**/') != -1){
			let startIndex = currentText.indexOf('/**designweb____editor_start**/') + 31;
			let endIndex = currentText.indexOf('/**designweb____editor_end**/') ;

			// 동일한 건은 처리 안하도록 처리
			if(currentText.substring(startIndex, endIndex) == text){
				console.log('변경사항이 없음')
				return;
			}

			let resultText = currentText.substring(0, startIndex) + 
				text + 
				currentText.substring(endIndex);
			 			
			edit.replace (
				this.document.uri, 
				new vscode.Range(0, 0, this.document.lineCount, 0),
				resultText,
			);
			return vscode.workspace.applyEdit(edit);
		} else if(currentText.indexOf('extends Va.View') == -1 &&
					currentText.indexOf('extends  Va.View') == -1 &&
					currentText.indexOf('extends\tVa.View') == -1 &&
					currentText.indexOf('config') == -1){ 
			console.log('Sub file의 경우 개발자가 직접 /**designweb____editor_start**/ /**designweb____editor_end**/를 지정해 주어야 합니다.');
			vscode.window.showErrorMessage('Va.View로 부터 상속받지 못했거나 config 설정이 안되어 있는 경우 개발자가 직접 /**designweb____editor_start**/ /**designweb____editor_end**/를 소스코드에 지정해 주어야 합니다.');
		} else {
			let ret = this.parseString(currentText);
			console.log('returnStr', ret.returnStr);
			console.log('returnStartIndex', ret.returnStartIndex);
			console.log('returnEndIndex', ret.returnEndIndex);
	
			let resultText = currentText.substring(0, ret.returnStartIndex) + 
				'\t\t/**designweb____editor_start**/\n\t\t' + 
				text + 
				'\t\t/**designweb____editor_end**/\n\t\t' + 
				currentText.substring(ret.returnEndIndex); 
	
			
			edit.replace (
				this.document.uri, 
				new vscode.Range(0, 0, this.document.lineCount, 0),
				resultText,
			);
			return vscode.workspace.applyEdit(edit);
		}
		 

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
	private parseString (str: string) {

		// 주석을 먼저 체크해서 해당하는 곳을 마스킹한다.
		let stringArray = [];
		for(let i=0; i < str.length;i++){
			//commentArray[i] = 0;
			stringArray[i] = 0;
		}
	
		for(let i=0; i < str.length; i++){
			if(str.substring(i, i+2) == '//'){
				for(let j= i+2; j < str.length; j++){
					console.log(j, str.substring(j,j+1))
					if(str.substring(j,j+1) == '\n'){
						for(let k=i; k < j+1; k++){
							stringArray[k] = '2';						
						}
						i=j+1;
						j = 9999999999;
						break;
					}
				}
			} else if(str.substring(i, i+2) == '/*'){
				for(let j= i+2; j < str.length; j++){
					if(str.substring(j,j+2) == '*/'){
						for(let k=i; k < j+2; k++){
							stringArray[k] = '2';
	
						}
						i=j+2;
						j = 9999999999;						
						break;
					}
				}
			} else if(str.substring(i, i+1) == '`'){
				for(let j= i+1; j < str.length; j++){
					if(str.substring(j,j+1) == '`'){
						for(let k=i; k < j+1; k++){
							stringArray[k] = '1';
	
						}
						i= j+1;
						j = 9999999999;						
						break;
					}
				}
			} else if(str.substring(i, i+1) == "'"){
				for(let j= i+1; j < str.length; j++){
					if(str.substring(j,j+1) == "'"){
						for(let k=i; k < j+1; k++){
							stringArray[k] = '1';
	
						}
						i= j+1;
						j = 9999999999;						
						break;
					}
				}
			} else if(str.substring(i, i+1) == '"'){
				for(let j= i+1; j < str.length; j++){
					if(str.substring(j,j+1) == '"'){
						for(let k=i; k < j+1; k++){
							stringArray[k] = '1';
	
						}
						i= j+1;
						j = 9999999999;
						break;
					}
				}
			}
		}
		
	
		// string과  comment를 마스킹함.
		console.log(stringArray);
		console.log('str', str);
	
		
		for(let i=0; i < str.length; i++){
			if(stringArray[i] == 0 ){
				for(let j=i; j< str.length; j++){
					if(stringArray[j] != 0){
						console.log('일반:' ,i,j, str.substring(i, j));
						i=j;
						break;
					}
				}
			}
			if(stringArray[i] == 1 ){
				for(let j=i; j< str.length; j++){
					if(stringArray[j] != 1){
						console.log('문자열:',i,j, str.substring(i, j));
						i=j;
						break;
					}
				}
			}
			if(stringArray[i] == 2){
				for(let j=i; j< str.length; j++){
					if(stringArray[j] != 2){
						console.log('주석:',i,j, str.substring(i, j));
						i=j;
						break;
					}
				}
			}
		}
		
	
		//export default class DemoGrid extends Va.View{
		let classStartIndex = 0;
		let classEndIndex = 0;
		let className = '';
		for(let i=0; i < str.length; i++){
			if(str.substring(i,i+6) == 'export' && stringArray[i] ==0){
				for(let j=0; j < str.length; j++){
					if(str.substring(j, j+5) == 'class' && stringArray[i] == 0){
						for(let k=j+1; k < str.length; k++){
							if(str.substring(k, k+7) == 'extends'){
								className = str.substring(j+5, k);
	
								for(let x=k+7; x < str.length; x++){
									if(str[x] == '{' && stringArray[x] == 0){
										classStartIndex = x;
										let tempCountY = 1;
										for(let y=x+1; y < str.length; y++){
											if(str[y] == '{' && stringArray[y] == 0){
												tempCountY++;
											}										
											if(str[y] == '}' && stringArray[y] == 0){
												tempCountY--;
												if(tempCountY ==0){
													classEndIndex = y+1;
													break;
												}
											}
										}
										break;
									}
								}			
								break;				
							}
						}
						break;
					}
				}
				break;
			}
		}
		console.log('className', className);
		
	
		console.log('classStartIndex', classStartIndex, classEndIndex);
		// root 함수를 찾기.
		let functionList = [];
		let functionListStartIndex = [];
		let functionListEndIndex = [];
		let parameterList = [];
		let parameterListStartIndex = [];
		let parameterListEndIndex = [];
		let bodyList = [];
		let bodyListStartIndex = [];
		let bodyListEndIndex = [];
		for(let i=classStartIndex+1; i < classEndIndex; i++){
			if(str[i] != ' ' && str[i] !=  '\t' && str[i] != '\n' && str[i] != '\r' && stringArray[i] == 0){
				for(let j= i+1; j < classEndIndex; j++){
					//if(str[j] == '\n'){
					//	break;
					//}
					if(str[j] == '(' && stringArray[j] == 0){					
						for(let k=i+1; k < j; k++){
							if(str[k] != ' ' || str[k] != '\t' || str[k] != '\n'  && stringArray[k] == 0){
								//let startIndexK = k;
								functionList.push(str.substring(k-1, j))
								functionListStartIndex.push(k-1);
								functionListEndIndex.push(j);
								let tempCountJ = 1;
								for(let x=j+1; x < str.length; x++){
									if(str[x] == '(' && stringArray[x] == 0){
										tempCountJ++;
									}
									if(str[x] == ')' && stringArray[x] == 0){
										tempCountJ--;
										if(tempCountJ == 0){
											parameterList.push(str.substring(j, x+1))
											parameterListStartIndex.push(j);
											parameterListEndIndex.push(x+1);
											for(let y= x+1; y < str.length; y++){
												if(str[y] == '{' && stringArray[y] == 0){
													let tempCountY = 1;
													for(let z=y+1; z < str.length; z++){
														if(str[z] == '{' && stringArray[z] == 0){
															tempCountY++;
														}
														if(str[z] == '}' && stringArray[z] == 0){
															tempCountY--;
															if(tempCountY == 0){
																bodyList.push(str.substring(y, z+1));
																bodyListStartIndex.push(y);
																bodyListEndIndex.push(z+1);
																i=z+1;	//<--- 이곳까지..
																break;
															}
														}
													}
													break;
												}
											}
											break;
										}
									}
								}
								break;
							}
						}
						break;
					}
				}
				// break.. 다음..
			}
		}
		console.log('함수');
		console.log('functionList', functionList);
		console.log('functionListStartIndex', functionListStartIndex);
		console.log('functionListEndIndex', functionListEndIndex);
	
		console.log('parameterList', parameterList);
		console.log('parameterListStartIndex', parameterListStartIndex);
		console.log('parameterListEndIndex', parameterListEndIndex);
	
		console.log('bodyList', bodyList);
		console.log('bodyListStartIndex', bodyListStartIndex);
		console.log('bodyListEndIndex', bodyListEndIndex);
	
		console.log('config 만 처리---------------------------');
	
		let configIndex = -1;
		for(let i=0; i < functionList.length; i++){
			if(functionList[i] == 'config'){
				configIndex = i;
				break;
			}
		}
		console.log('bodyList', str.substring(bodyListStartIndex[configIndex], bodyListEndIndex[configIndex]));
		// 정확함.
		let configStartIndex = bodyListStartIndex[configIndex];
		let configEndIndex = bodyListEndIndex[configIndex];
	
		let returnStartIndex  = 0;
		let returnEndIndex = 0;
		for(let i= configStartIndex; i < configEndIndex; i++){
			if(str.substring(i,i+6) == 'return' && stringArray[i] == 0){
				for(let j=i+1; j< configEndIndex; j++){
					
					if(str[j] == '(' && stringArray[j] == 0){
						returnStartIndex = j+1;
						let tempCountJ=1;
						for(let k=j+1; k < configEndIndex; k++){
							if(str[k] == '(' && stringArray[j] == 0){
								tempCountJ++;
							}
							if(str[k] == ')' && stringArray[j] == 0){
								tempCountJ--;
								if(tempCountJ == 0){
									returnEndIndex = k;
									break;
								}
							}
						}
						break;
					}
				}
				break;
			}
		}
	
		console.log('returnStr---->', str.substring(returnStartIndex, returnEndIndex));
	
	
		let returnStr = str.substring(returnStartIndex, returnEndIndex);
	
		

		return {
			functionList: functionList,
			functionListStartIndex: functionListStartIndex,
			functionListEndIndex: functionListEndIndex,
		
			parameterList: parameterList,
			parameterListStartIndex: parameterListStartIndex,
			parameterListEndIndex: parameterListEndIndex,
		
			bodyList: bodyList,
			bodyListStartIndex: bodyListStartIndex,
			bodyListEndIndex: bodyListEndIndex,
			returnStr: returnStr,
			returnStartIndex: returnStartIndex,
			returnEndIndex: returnEndIndex
		}
	}
}

