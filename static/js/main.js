const {
    Component,
} = window.Torus;

console.log('testing mira');

/* all styles done within main.css, not components */

class App extends Component {

    init() {

    }

    compose() {
        return jdom`<div>
            hi
        </div>`;
    }

}

const app = new App();
document.getElementById('app').appendChild(app.node);
