const {
    Record,
    StoreOf,
    Component,
    ListOf,
} = window.Torus;

const DATA_ORIGIN = '/data';

/* all styles done within main.css, not components */

class Contact extends Record {

    singleProperties() {
        return ['name', 'place', 'work'];
    }

    multiProperties() {
        return ['tel', 'email'];
    }

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

    init(record, remover, {persister, sorter}) {
        this.isEditing = false;

        this.addTel = this.addMultiItem.bind(this, 'tel');
        this.addEmail = this.addMultiItem.bind(this, 'email');
        this.toggleIsEditing = this.toggleIsEditing.bind(this);
        this.toggleIsEditingSilently = this.toggleIsEditingSilently.bind(this);

        this.remover = () => {
            remover();
            persister();
        }
        this.persister = persister;
        this.sorter = sorter;

        this.bind(record, data => this.render(data));
    }

    addMultiItem(label) {
        this.record.update({[label]: (this.record.get(label) || []).concat('')});
    }

    toggleIsEditing(evt) {
        evt.stopPropagation();

        if (this.isEditing) {
            const changes = {};
            for (const label of this.record.singleProperties()) {
                const value = this.node.querySelector(`input[name=${label}]`).value.trim();
                changes[label] = value;
            }
            for (const label of this.record.multiProperties()) {
                const inputs = this.node.querySelectorAll(`input[name=${label}]`);
                const values = Array.from(inputs).map(el => el.value.trim()).filter(el => el !== '');
                changes[label] = values;
            }
            this.record.update(changes);
            this.persister();
            this.sorter();
        }

        this.toggleIsEditingSilently();
    }

    toggleIsEditingSilently(evt) {
        if (evt) {
            evt.stopPropagation();
        }

        this.isEditing = !this.isEditing;
        this.render();
    }

    compose(data) {
        const inputGroup = (label, prop, placeholder) => {
            const val = data[prop];

            if (!this.isEditing && val == null) {
                return null;
            }

            return jdom`<div class="inputGroup">
                <label>${label}</label>
                <div class="entries">
                    ${this.isEditing ? (
                        jdom`<input type="text" name="${prop}" value="${val}" placeholder="${placeholder}" />`
                    ) : (
                        jdom`<div>${val}</div>`
                    )}
                </div>
            </div>`;
        }

        const inputMultiGroup = (label, prop, placeholder) => {
            const vals = data[prop] || [];

            if (!this.isEditing && vals.length === 0) {
                return null;
            }

            return jdom`<div class="inputGroup">
                <label>${label}</label>
                <div class="entries">
                    ${this.isEditing ? (
                        vals.map(t => jdom`<input type="text" name="${prop}" value="${t}" placeholder="${placeholder}" />`)
                            .concat(jdom`<button onclick="${this.addMultiItem.bind(this, prop)}">+ ${placeholder}</button>`)
                    ) : (
                        vals.map(t => jdom`<span>${t}</span>`)
                    )}
                </div>
            </div>`;
        }

        return jdom`<li class="contact-item card paper block split-v" onclick="${this.isEditing || this.toggleIsEditing}">
            <div class="editArea split-h">
                <div class="left">
                    ${this.record.singleProperties().map(label => {
                        return inputGroup(label, label, label)
                    })}
                </div>
                <div class="right">
                    ${this.record.multiProperties().map(label => {
                        return inputMultiGroup(label, label, label)
                    })}
                </div>
            </div>
            ${this.isEditing ? jdom`<div class="split-h">
                <div class="left buttonArea">
                    <button class="frost block card" onclick="${this.remover}">delete</button>
                </div>
                <div class="right buttonArea">
                    <button class="frost block card" onclick="${this.toggleIsEditingSilently}">cancel</button>
                    <button class="frost block card" onclick="${this.toggleIsEditing}">save</button>
                </div>
            </div>` : null}
        </li>`;
    }

}

class ContactList extends ListOf(ContactItem) {

    compose(items) {
        return jdom`<ul class="contact-list">
            ${this.nodes}
        </div>`;
    }

}

class App extends Component {

    init() {
        this.searchInput = '';

        this.handleSearch = this.handleSearch.bind(this);

        this.contacts = new ContactStore();
        this.list = new ContactList(
            this.contacts,
            {
                persister: () => this.contacts.persist(),
                sorter: () => this.list.itemsChanged(),
            },
        );
    }

    handleSearch(evt) {
        this.searchInput = evt.target.value.trim();

        if (this.searchInput === '') {
            this.list.unfilter();
            return
        }

        const kw = this.searchInput.toLowerCase();
        function matches(s) {
            return s.toString().toLowerCase().includes(kw);
        }

        this.list.filter(contact => {
            for (const v of Object.values(contact.serialize())) {
                if (v == null) {
                    continue;
                }

                if (Array.isArray(v)) {
                    for (const it of v) {
                        if (matches(it)) {
                            return true;
                        }
                    }
                } else {
                    if (matches(v)) {
                        return true;
                    }
                }
            }

            return false;
        });
    }

    compose() {
        return jdom`<div>
            <header>
                <div class="title">
                    <a href="/">mira</a>
                </div>
                <div class="searchBar card">
                    <input type="text" value="${this.searchInput}"
                        class="searchInput paper block"
                        oninput="${this.handleSearch}"
                        placeholder="type to search..." />
                </div>
                <button class="addButton card frost block"
                    onclick="${() => this.contacts.create({name: 'person'})}">add</button>
            </header>
            ${this.list.node}
            <footer>
                <a href="https://github.com/thesehpist/mira" target="_blank">src</a>,
                &#169; 2020
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
