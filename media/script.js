console.log('script.js called..................')
const vscode = acquireVsCodeApi();
window.addEventListener('message', e => {
	console.log('e--->', e);

	const message = e.data;

	if (typeof message == 'string' && message.length > 4 && message.substring(0, 7) == 'va-send') { // iframe -> 여기로.
		vscode.postMessage({ type: 'change', text: message.substring(7) });
	} else if (typeof message == 'string' && message.length > 4 && message.substring(0, 7) == 'va-rtrv') { // iframe -> 여기로.
		vscode.postMessage({ type: 'retrieve' });
	} else if (typeof message == 'string' && message.length > 4 && message.substring(0, 7) == 'va-file') { // iframe -> 여기로.
		vscode.postMessage({ type: 'writeFile', text: message.substring(7) });
	} else if (typeof message == 'string' && message.length > 4 && message.substring(0, 7) == 'va-list') { // iframe -> 여기로.
		vscode.postMessage({ type: 'readFileList', text: message.substring(7) });
	} else if (typeof message == 'string' && message.length > 4 && message.substring(0, 7) == 'va-writ') { // iframe -> 여기로.
		vscode.postMessage({ type: 'writeDiagram', text: message.substring(7) });
	} else if (typeof message == 'string' && message.length > 4 && message.substring(0, 7) == 'va-wred') { // iframe -> 여기로.
		console.log("메시지 날림")
		vscode.postMessage({ type: 'writeDiagramComponent', text: message.substring(7) });
	} else if (typeof message == 'string' && message.length > 4 && message.substring(0, 7) == 'va-wrtm') { // iframe -> 여기로.
		console.log("메시지 날림")
		vscode.postMessage({ type: 'writeDiagramTemplate', text: message.substring(7) });
	} else { // Extension -> 여기 -> iframe
		console.log('message', message);
		let vaIframe = document.getElementById('va_iframe');
		console.log('iframe', vaIframe)
		console.log('iframe', vaIframe.contentWindow)
		if (message.type === 'update') {
			if (message.updateType === 'save') {
				console.log('script-save')
				vaIframe.contentWindow.postMessage('va-save' + message.text, '*');
			}
			/* else if (message.updateType === 'change') {
				console.log('script-change')
				vaIframe.contentWindow.postMessage('va-chng' + message.text, '*');
			}*/
			else if (message.updateType === 'retrieve') {
				console.log('script-retrieve')
				vaIframe.contentWindow.postMessage('va-rtrv' + message.text, '*');
			} else if (message.updateType === 'getCurrentFilePath') {
				console.log('script-retrieve')
				vaIframe.contentWindow.postMessage('va-getf' + message.text, '*');
			} else if (message.updateType === 'readFileList') {
				console.log('script-list')
				vaIframe.contentWindow.postMessage('va-list' + message.text, '*');
			}
			else{
				console.error('update from extension is not recognized!');
			}
		}
	}
});

//vscode.postMessage({ type: 'retrieve' });

//vscode.postMessage({type:'error', message:'error'});

function onSend(value) {
	vscode.postMessage({ type: 'change', text: value });
	vscode.Webview.dispose();
}

function recieveFromIframe(value) {
	alert(value);
	vscode.postMessage({ type: 'change', text: value });
}

function sendToIframe(value) {
	let iframe = document.getElementById('va_iframe');
	console.log('iframe', iframe);
	iframe.contentWindow.recieveFromParent(value);
}