const {
    Record,
    StoreOf,
    Component,
    ListOf,
} = window.Torus;

const DATA_ORIGIN = '/data';

const PAGIATE_BY = 100;

const TODAY_ISO = (new Date()).toISOString().slice(0, 10);

//> Debounce coalesces multiple calls to the same function in a short
//  period of time into one call, by cancelling subsequent calls within
//  a given timeframe.
const debounce = (fn, delayMillis) => {
    let lastRun = 0;
    let to = null;
    return (...args) => {
        clearTimeout(to);
        const now = Date.now();
        const dfn = () => {
            lastRun = now;
            fn(...args);
        }
        if (now - lastRun > delayMillis) {
            dfn()
        } else {
            to = setTimeout(dfn, delayMillis);
        }
    }
}

const isInputNode = node => {
    return ['input', 'textarea'].includes(node.tagName.toLowerCase());
}

class Contact extends Record {

    singleProperties() {
        return [
            ['name', 'name', 'name'],
            ['place', 'place', 'place'],
            ['work', 'work', 'work'],
            ['twttr', 'twttr', '@username'],
            ['last', 'last', 'last met...'],
            ['notes', 'notes', 'notes', true],
        ];
    }

    multiProperties() {
        return [
            ['tel', 'tel', 'tel'],
            ['email', 'email', 'email'],
            ['mtg', 'mtg', 'meeting', true],
        ]
    }

}

class ContactStore extends StoreOf(Contact) {

    init(...args) {
        this.super.init(...args);
    }

    get comparator() {
        return contact => {
            // ? is a special sentinel value that belongs at top of list
            if (contact.get('name') === '?') {
                return -Infinity;
            }

            const last = contact.get('last');
            if (!last) {
                return 0;
            }

            const lastDate = new Date(last);
            return -lastDate.getTime();
        }
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
        return fetch(DATA_ORIGIN, {
            method: 'POST',
            body: JSON.stringify(this.serialize()),
        });
    }

}

class ContactItem extends Component {

    init(record, remover, {persister, sorter}) {
        this.isEditing = false;

        this.inputs = {};

        this.toggleIsEditing = this.toggleIsEditing.bind(this);
        this.toggleIsEditingSilently = this.toggleIsEditingSilently.bind(this);
        this.handleDeleteClick = this.handleDeleteClick.bind(this);
        this.fillToday = this.fillToday.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.persistIfEnter = this.persistIfEnter.bind(this);

        this.remover = () => {
            remover();
            persister();
        }
        this.persister = persister;
        this.sorter = sorter;

        this.bind(record, data => this.render(data));
    }

    addMultiItem(label) {
        this.inputs[label] = (this.inputs[label] || []).concat('');
        this.render();
    }

    toggleIsEditing(evt) {
        if (evt) {
            evt.stopPropagation();
        }

        if (this.isEditing) {
            // remove empty items
            for (const [prop, item] of Object.entries(this.inputs)) {
                if (item == null) {
                    continue;
                }

                if (Array.isArray(item)) {
                    this.inputs[prop] = item.map(it => it.trim()).filter(it => it !== '');
                } else {
                    this.inputs[prop] = item.toString().trim();
                }
            }

            this.record.update(this.inputs);
            this.persister();
            this.sorter();
        } else {
            this.inputs = {};

            for (const [prop, item] of Object.entries(this.record.serialize())) {
                if (Array.isArray(item)) {
                    this.inputs[prop] = item.slice();
                } else {
                    this.inputs[prop] = item;
                }
            }
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

    handleDeleteClick(evt) {
        if (window.confirm(`Delete ${this.record.get('name')}?`)) {
            this.remover();
        }
    }

    fillToday(evt) {
        this.inputs.last = TODAY_ISO;
        this.render();
    }

    handleInput(evt) {
        const propIdx = evt.target.getAttribute('name');
        if (propIdx.includes('-')) {
            // multi style prop
            const [prop, idx] = propIdx.split('-');
            this.inputs[prop][idx] = evt.target.value;
        } else {
            // single style prop
            this.inputs[propIdx] = evt.target.value;
        }
        this.render();
    }

    persistIfEnter(evt) {
        if (evt.key === 'Enter' && (evt.ctrlKey || evt.metaKey)) {
            this.toggleIsEditing();
        }
    }

    compose(data) {
        const inputGroup = (label, prop, placeholder, isMultiline = false) => {
            const val = this.isEditing ? this.inputs[prop] : data[prop];

            if (!this.isEditing && !val) {
                return null;
            }

            const tag = isMultiline ? 'textarea' : 'input';

            return jdom`<div class="inputGroup">
                <label class="contact-label">${label}</label>
                <div class="entries">
                    ${this.isEditing ? (
                        jdom`<${tag} type="text" name="${prop}" value="${val || ''}"
                            class="contact-input"
                            autocomplete="none"
                            onkeydown="${this.persistIfEnter}"
                            oninput="${this.handleInput}"
                            placeholder="${placeholder}" />`
                    ) : (
                        jdom`<div>${val}</div>`
                    )}
                </div>
            </div>`;
        }

        const inputMultiGroup = (label, prop, placeholder, isMultiline = false) => {
            const vals = (this.isEditing ? this.inputs[prop] : data[prop]) || [];

            if (!this.isEditing && vals.length === 0) {
                return null;
            }

            const tag = isMultiline ? 'textarea' : 'input';

            return jdom`<div class="inputGroup">
                <label class="contact-label">${label}</label>
                <div class="entries">
                    ${this.isEditing ? (
                        vals.map((t, idx) => jdom`<${tag} type="text" name="${prop}-${idx}" value="${t || ''}"
                                class="contact-input"
                                autocomplete="none"
                                onkeydown="${this.persistIfEnter}"
                                oninput="${this.handleInput}"
                                placeholder="${placeholder}" />`)
                            .concat(jdom`<button class="contact-add-button"
                                onclick="${this.addMultiItem.bind(this, prop)}">+ ${placeholder}</button>`)
                    ) : (
                        vals.map(t => jdom`<span>${t.substr(0, 256)}</span>`)
                    )}
                </div>
            </div>`;
        }

        return jdom`<li class="contact-item card paper block split-v ${this.isEditing ? 'isEditing' : 'notEditing'}"
                onclick="${this.isEditing || this.toggleIsEditing}"
                onkeyup="${evt => {
                    if (evt.target !== this.node) return;

                    if (evt.key === 'Enter' && !this.isEditing) {
                        this.toggleIsEditing();
                    } else if (evt.key === 'Escape' && this.isEditing) {
                        this.toggleIsEditingSilently();
                    }
                }}"
                tabIndex="0">
            <div class="editArea split-h">
                <div class="left contact-single-items">
                    ${this.record.singleProperties().map(args => {
                        return inputGroup(...args)
                    })}
                </div>
                <div class="right contact-multi-items">
                    ${this.record.multiProperties().map(args => {
                        return inputMultiGroup(...args)
                    })}
                </div>
            </div>
            ${this.isEditing ? jdom`<div class="buttonFooter split-h frost">
                <div class="left buttonArea">
                    <button class="contact-button" onclick="${this.handleDeleteClick}">delete</button>
                </div>
                <div class="right buttonArea">
                    <button class="contact-button" onclick="${this.fillToday}">today!</button>
                    <button class="contact-button" onclick="${this.toggleIsEditingSilently}">cancel</button>
                    <button class="contact-button" onclick="${this.toggleIsEditing}">save</button>
                </div>
            </div>` : null}
        </li>`;
    }

}

class ContactList extends ListOf(ContactItem) {

    compose(items) {
        return jdom`<ul class="contact-list">
            ${this.nodes.slice(0, PAGIATE_BY)}
        </div>`;
    }

}

class App extends Component {

    init() {
        this.searchInput = '';
        this.isFetching = false;

        this.handleInput = this.handleInput.bind(this);
        this.handleSearch = debounce(this.handleSearch.bind(this), 200);

        this.contacts = new ContactStore();
        this.list = new ContactList(
            this.contacts,
            {
                persister: async () => {
                    this.isFetching = true;
                    this.render();

                    await this.contacts.persist();

                    this.isFetching = false;
                    this.render();
                },
                sorter: () => this.list.itemsChanged(),
            },
        );

        // Provide the vim-style shortcut of '/' starting a search
        document.addEventListener('keyup', evt => {
            if (!isInputNode(evt.target) && evt.key === '/') {
                evt.preventDefault();
                this.node.querySelector('.searchInput').focus();
            }
        });

        const initialSearchInput = new URLSearchParams(window.location.search).get('q');
        if (initialSearchInput) {
            this.searchInput = decodeURIComponent(initialSearchInput);
            this.handleSearch();
        }

        (async () => {
            this.isFetching = true;
            this.render();

            await this.contacts.fetch();

            this.isFetching = false;
            this.render();
        })();
    }

    handleInput(evt) {
        this.searchInput = evt.target.value;
        this.render();

        this.handleSearch();
    }

    handleSearch() {
        const url = new URL(window.location.href);
        if (this.searchInput) {
            url.searchParams.set('q', encodeURIComponent(this.searchInput));
        } else {
            url.searchParams.delete('q');
        }
        window.history.replaceState(null, document.title, url.toString());

        const trimmedInput = this.searchInput.trim();

        if (trimmedInput === '') {
            this.list.unfilter();
            this.render();
            return
        }

        // if search is in the form `[word]: [...words]`
        // we only search field named [word].
        const match = trimmedInput.match(/^(\w+):(.*)$/)
        if (match) {
            const [_, prop, kw_o] = match;
            const kw = kw_o.trim().toLowerCase();
            function matches(s) {
                return s.toString().toLowerCase().includes(kw);
            }

            this.list.filter(contact => {
                const v = contact.serialize()[prop];

                if (v == null) {
                    return false;
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

                return false;
            });
        } else {
            const kw = trimmedInput.toLowerCase();
            function matches(s) {
                return s.toString().toLowerCase().includes(kw);
            }

            this.list.filter(contact => {
                // Newly added contacts should show up, even in a filtered view
                if (contact.get('name') === '?') {
                    return true;
                }

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

        // Manually render once to update search result count
        this.render();
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
                        oninput="${this.handleInput}"
                        placeholder="search people..."
                        autofocus />
                    <div class="matchCount">${this.list.items.size}</div>
                </div>
                <button class="addButton card frost block"
                    onclick="${() => this.contacts.create({
                        name: '?',
                        last: TODAY_ISO,
                    })}">add</button>
            </header>
            ${this.list.node}
            <footer>
                <a href="https://github.com/thesephist/mira" target="_blank">src</a>
                ::
                &#169; 2020
            </footer>
            ${this.isFetching ? jdom`<div class="loader" />`: null}
        </div>`;
    }

}

const app = new App();
document.getElementById('app').appendChild(app.node);
