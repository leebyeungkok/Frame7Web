const vscode = acquireVsCodeApi();
window.addEventListener('message', e => {
	console.log('e--->', e);
	const message = e.data;

	if (typeof message == 'string' && message.length > 4 && message.substring(0, 7) == 'va-send') { // iframe -> 여기로.
		vscode.postMessage({ type: 'change', text: message.substring(7) });
	} else if (typeof message == 'string' && message.length > 4 && message.substring(0, 7) == 'va-rtrv') { // iframe -> 여기로.
		vscode.postMessage({ type: 'retrieve' });
	} else { // Extension -> 여기 -> iframe
		console.log('message', message);
		let vaIframe = document.getElementById('va_iframe');
		console.log('iframe', vaIframe)
		console.log('iframe', vaIframe.contentWindow)
		if (message.updateType === 'save') {
			vaIframe.contentWindow.postMessage('va-save' + message.text, '*');
		} else if (message.updateType === 'change') {
			vaIframe.contentWindow.postMessage('va-chng' + message.text, '*');
		} else if (message.updateType === 'retrieve') {
			vaIframe.contentWindow.postMessage('va-rtrv' + message.text, '*');
		}
	}
});

vscode.postMessage({ type: 'retrieve' });

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