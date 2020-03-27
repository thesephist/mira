const {
    Record,
    StoreOf,
    Component,
    ListOf,
} = window.Torus;

const DATA_ORIGIN = '/data';

/* all styles done within main.css, not components */

class Contact extends Record {

}

class ContactStore extends StoreOf(Contact) {

    get comparator() {
        return contact => contact.get('name');
    }

    async fetch() {
        const data = await fetch(DATA_ORIGIN).then(resp => resp.json());
        if (!Array.isArray(data)) {
            throw new Error(`Expected data to be an array, got ${data}`);
        }

        this.reset(data.map(rec => new this.recordClass({
            ...rec,
            id: rec.id,
        })));
    }

    async persist() {
        const data = this.serialize();
        return fetch(DATA_ORIGIN, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

class ContactItem extends Component {

    init(record) {
        this.isEditing = false;

        this.addTel = this.addTel.bind(this);
        this.addEmail = this.addEmail.bind(this);
        this.toggleIsEditing = this.toggleIsEditing.bind(this);

        this.bind(record, data => this.render(data));
    }

    addTel() {
        // US number by default
        this.record.update({tel: (this.record.get('tel') || []).concat('+1')});
    }

    addEmail() {
        // US number by default
        this.record.update({email: (this.record.get('email') || []).concat('name@example.com')});
    }

    toggleIsEditing(evt) {
        evt.stopPropagation();

        if (this.isEditing) {
            for (const label of ['tel', 'email']) {
                const inputs = this.node.querySelectorAll(`input[name=${label}]`);
                const values = Array.from(inputs).map(el => el.value.trim()).filter(el => el !== '');
                this.record.update({[label]: values});
            }
        }

        this.isEditing = !this.isEditing;
        this.render();
    }

    compose(data) {
        // NOTE: contact schema
        const {
            name,
            place = '',
            tel = [],
            email = [],
        } = data;

        return jdom`<li class="contact-item" onclick="${this.isEditing || this.toggleIsEditing}">
            <div class="left">
                <div class="name">${name}</div>
            </div>
            <div class="right">
                <div class="tel">
                    ${this.isEditing ? (
                        tel.map(t => jdom`<input type="tel" name="tel" value="${t}"/>`)
                            .concat(jdom`<button onclick="${this.addTel}">+ tel</button>`)
                    ) : (
                        tel.map(t => jdom`<a href="tel:${t}">${t}</a>`)
                    )}
                </div>
                <div class="email">
                    ${this.isEditing ? (
                        email.map(t => jdom`<input type="email" name="email" value="${t}"/>`)
                            .concat(jdom`<button onclick="${this.addEmail}">+ email</button>`)
                    ) : (
                        email.map(t => jdom`<a href="mailto:${t}">${t}</a>`)
                    )}
                </div>
                ${this.isEditing ? jdom`<button onclick="${this.toggleIsEditing}">save</button>` : null}
            </div>
        </li>`;
    }

}

class ContactList extends ListOf(ContactItem) {

    compose(items) {
        return jdom`<ul class="contact-list">
            <li class="contact-item">
                <button onclick="${() => this.store.create({name: 'person'})}">add</button>
            </li>
            ${this.nodes}
        </div>`;
    }

}

class App extends Component {

    init() {
        this.contacts = new ContactStore();
        this.list = new ContactList(this.contacts);
    }

    compose() {
        return jdom`<div>
            <header>
                <strong>Mira</strong>
                <button onclick="${() => this.contacts.persist()}">save</button>
            </header>
            ${this.list.node}
            <footer>
                <a href="https://github.com/thesehpist/mira" target="_blank">src</a>
            </footer>
        </div>`;
    }

}

const app = new App();
document.getElementById('app').appendChild(app.node);

// load contacts from origin
app.contacts.fetch();

// XXX: for debugging
window.app = app;
