import { fetchAnkiDecks, fetchExistingCards, setAnkiConnectKey, requestPermission } from "./anki";

const integrationsForm = document.getElementById('integration-options');
// const forvoField = document.getElementById('forvo-api-key');
const openAiField = document.getElementById('openai-api-key');
const resultMessage = document.getElementById('result-message');
const popoverDelayField = document.getElementById('popover-delay');

const ankiConnectField = document.getElementById('anki-connect-info');
const ankiConnectStatusCheckButton = document.getElementById('check-anki-connect-status');
const ankiConnectKeyInput = document.getElementById('anki-connect-key');

integrationsForm.addEventListener('submit', function (e) {
    e.preventDefault();
    setAnkiConnectKey(ankiConnectKeyInput.value);
    // https://developer.chrome.com/docs/extensions/reference/api/storage
    // By default, it's not exposed to content scripts (storage.session)
    chrome.storage.sync.set({
        /*'forvoKey': forvoField.value,*/
        'openAiKey': openAiField.value,
        'ankiConnectKey': ankiConnectKeyInput.value,
        'popoverDelay': parseInt(popoverDelayField.value) || 500,
    }).then(() => {
        resultMessage.innerText = "Successfully saved.";
        setTimeout(() => {
            resultMessage.innerText = '';
        }, 3000);
    });
});


chrome.storage.sync.get().then(items => {
    if (!items.openAiKey && !items.ankiConnectKey) {
        renderAnkiConnectStatus();
    }
    openAiField.value = items.openAiKey || '';
    ankiConnectKeyInput.value = items.ankiConnectKey || '';
    popoverDelayField.value = items.popoverDelay || 500;
    setAnkiConnectKey(items.ankiConnectKey);
    renderAnkiConnectStatus();
});

async function renderAnkiConnectStatus() {
    const permissionResult = await requestPermission();
    if (!permissionResult || permissionResult.permission === 'denied') {
        ankiConnectField.innerText = `Could not reach AnkiConnect. You may need to install it or grant permissions.`;
        // i know i shouldn't
        ankiConnectField.style.border = '4px solid #ff635f';
        return;
    }
    if (permissionResult.requireApikey) {
        Array.from(document.getElementsByClassName('anki-connect-key')).forEach(keyElement => keyElement.removeAttribute('style'))
    } else {
        // we don't need the key, and seemingly including one in that case causes problems...
        Array.from(document.getElementsByClassName('anki-connect-key')).forEach(keyElement => keyElement.style.display = 'none');
        chrome.storage.sync.remove('ankiConnectKey');
        setAnkiConnectKey(undefined);
    }
    const decks = await fetchAnkiDecks();
    if (decks.length != 0) {
        const existingCards = await fetchExistingCards();
        ankiConnectField.innerText = `Successfully connected to AnkiConnect.
        Found ${decks.length} existing decks, and ${Object.entries(existingCards).length} cards created by ChineseLearningExtension.`;
        ankiConnectField.style.border = '4px solid #66c42b';
    } else {
        ankiConnectField.innerText = `Either could not reach AnkiConnect, or no decks found. See above for instructions.`;
        ankiConnectField.style.border = '4px solid #ff635f';
    }
}

ankiConnectStatusCheckButton.addEventListener('click', async function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    await chrome.storage.sync.set({
        'ankiConnectKey': ankiConnectKeyInput.value
    });
    setAnkiConnectKey(ankiConnectKeyInput.value);
    await renderAnkiConnectStatus();
});