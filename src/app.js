import WebGL from 'three/addons/capabilities/WebGL.js';
import { Viewer } from './viewer.js';
import { Validator } from './validator.js';
import { Footer } from './components/footer';
import queryString from 'query-string';

window.VIEWER = {};

if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    console.error('The File APIs are not fully supported in this browser.');
} else if (!WebGL.isWebGLAvailable()) {
    console.error('WebGL is not supported in this browser.');
}

class App {
    /**
     * @param  {Element} el
     * @param  {Location} location
     */
    constructor(el, location) {
        const hash = location.hash ? queryString.parse(location.hash) : {};
        this.options = {
            kiosk: Boolean(hash.kiosk),
            model: hash.model || '',
            preset: hash.preset || '',
            cameraPosition: hash.cameraPosition ? hash.cameraPosition.split(',').map(Number) : null,
        };

        this.el = el;
        this.viewer = null;
        this.viewerEl = null;
        this.spinnerEl = el.querySelector('.spinner');
        this.dropEl = el.querySelector('.dropzone');
        this.validator = new Validator(el);

        // Remove the drag-and-drop feature
        // this.createDropzone();
        this.hideSpinner();

        // Load the dress.glb model on initialization
        this.load();
    }

    /**
     * Sets up the view manager.
     * @return {Viewer}
     */
    createViewer() {
        this.viewerEl = document.createElement('div');
        this.viewerEl.classList.add('viewer');
        this.dropEl.innerHTML = '';
        this.dropEl.appendChild(this.viewerEl);
        this.viewer = new Viewer(this.viewerEl, this.options);
        return this.viewer;
    }

    /**
     * Loads the dress.glb file from the public folder.
     */
    load() {
        const rootFile = 'gold_dress.glb'; // Path to the dress.glb file
        const rootPath = ''; // Adjust if needed

        this.view(rootFile, rootPath, new Map());
    }

    /**
     * Passes a model to the viewer, given file and resources.
     * @param  {File|string} rootFile
     * @param  {string} rootPath
     * @param  {Map<string, File>} fileMap
     */
    view(rootFile, rootPath, fileMap) {
        if (this.viewer) this.viewer.clear();

        const viewer = this.viewer || this.createViewer();

        const fileURL = typeof rootFile === 'string' ? rootFile : URL.createObjectURL(rootFile);

        const cleanup = () => {
            this.hideSpinner();
            if (typeof rootFile === 'object') URL.revokeObjectURL(fileURL);
        };

        viewer
            .load(fileURL, rootPath, fileMap)
            .catch((e) => this.onError(e))
            .then((gltf) => {
                // TODO: GLTFLoader parsing can fail on invalid files. Ideally,
                // we could run the validator either way.
                if (!this.options.kiosk) {
                    this.validator.validate(fileURL, rootPath, fileMap, gltf);
                }
                cleanup();
            });
    }

    /**
     * @param  {Error} error
     */
    onError(error) {
        let message = (error || {}).message || error.toString();
        if (message.match(/ProgressEvent/)) {
            message = 'Unable to retrieve this file. Check JS console and browser network tab.';
        } else if (message.match(/Unexpected token/)) {
            message = `Unable to parse file content. Verify that this file is valid. Error: "${message}"`;
        } else if (error && error.target && error.target instanceof Image) {
            message = 'Missing texture: ' + error.target.src.split('/').pop();
        }
        window.alert(message);
        console.error(error);
    }

    showSpinner() {
        this.spinnerEl.style.display = '';
    }

    hideSpinner() {
        this.spinnerEl.style.display = 'none';
    }
}

document.body.innerHTML += Footer();

document.addEventListener('DOMContentLoaded', () => {
    const app = new App(document.body, location);

    window.VIEWER.app = app;

    console.info('[glTF Viewer] Debugging data exported as `window.VIEWER`.');
});
