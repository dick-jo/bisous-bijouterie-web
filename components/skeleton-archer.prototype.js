const _CSS_ = {
	host: undefined // Reserved for internal component style
	// init: '../../style/init.style.css',
	// typography: '../../style/typography.style.css',
	// grid: '../../style/grid.global.style.css'
}

// ------------------------------------------------------------
// Prototype
// ------------------------------------------------------------
export class SkeletonArcher extends HTMLElement {
	constructor(SCHEMA) {
		super() // REQUIRED: Initialises HTML element
		this._internals = this.attachInternals() // REQUIRED: Provides Element Internals API

		this._init(SCHEMA)
	}

	// ------------------------------------------------------------
	// Framework
	// ------------------------------------------------------------
	_init(SCHEMA) {
		// Initialise
		this._initSchema(SCHEMA) // Instantiate from provided schema
		this._initShadow() // Create template and attach shadow

		// Synchronise
		this._pull() // Pull external (DOM) attributes
		this._push() // Push internal (js) properties

		// Rendering
		typeof this._prepare === 'function' && this._prepare()
		this._attachStyle(SCHEMA.CSS)
		this._render()

		// DOM attachments
		this.constructor.exists(this._parts) && this._attachParts()
	}

	_initSchema(SCHEMA) {
		SCHEMA.PROPS ? (this._props = structuredClone(SCHEMA.PROPS)) : (this._props = {})
		this._props._private = {}
		SCHEMA.STATE ? (this._state = structuredClone(SCHEMA.STATE)) : (this._state = {})
		SCHEMA.PARTS && (this._parts = structuredClone(SCHEMA.PARTS))
		SCHEMA.VARIANTS ? (this._variants = structuredClone(SCHEMA.VARIANTS)) : (this._variants = {})
		SCHEMA.CONFIG ? (this._config = structuredClone(SCHEMA.CONFIG)) : (this._config = {})
	}

	_initShadow() {
		this._template = document.createElement('template')
		this._style = {
			host: document.createElement('link'),
			init: _CSS_.init ? document.createElement('link') : undefined,
			typography: _CSS_.typography ? document.createElement('link') : undefined,
			grid: _CSS_.grid ? document.createElement('link') : undefined
		}
		this._shadow = this.attachShadow({ mode: 'open' })
	}

	_pull() {
		const prArr = Object.keys(this._props) // Create array of internally declared props
		const stArr = Object.keys(this._state) // ...states
		const variantArr = Object.keys(this._variants) // ...variants

		for (const attr of this.attributes) {
			// Validation of props when pulling attributes -> internal props:
			// -> must have a value
			// -> prop name must have been declared internally (...new props cannot be added via attributes)
			if (attr.value && prArr.includes(this.constructor.camelToSentence(attr.name))) {
				this._props[this.constructor.camelToSentence(attr.name)] = attr.value
			}

			// Validation of states when pulling attributes -> internal state:
			// -> must be valueless (name only)
			// -> must contain 'state-' prefix
			// -> state name must have been declared internally (...new states cannot be added via attributes)
			else if (attr.name.slice(0, 6) === 'state-' && stArr.includes(attr.name.slice(6))) {
				this._state[attr.name.slice(6)] = true
			}

			// Validation of states when pulling attributes -> internal variants:
			// -> must contain 'variant-' prefix
			// -> variant must have been declared internally (...new variants cannot be added via attributes)
			// -> variant attribute may contain multiple values separated by a single space (' ')
			else if (attr.name === 'variant') {
				const variantValArr = attr.value.split(' ')

				for (const val of variantValArr) {
					if (variantArr.includes(this.constructor.camelToSentence(val))) {
						this._variants[this.constructor.camelToSentence(val)] = true
					}
				}
			}

			// Get config object
			// -> name that points to a globally scoped config object
			// -> object schema must match what is expected by respective component
			else if (attr.name === 'config') {
				Object.defineProperty(this._config, 'key', {
					value: attr.value
				})
			}
		}
	}

	_push() {
		this._pushProps()
		this._pushState()
	}

	_pushProps() {
		for (const prop in this._props) {
			if (prop !== '_private' && this._props[prop] !== undefined) {
				this.setAttribute(prop, this._props[prop])
			}
		}
	}

	_pushState() {
		for (const state in this._state) {
			if (state !== '_private' && this._state[state]) {
				this.setAttribute(`state-${this.constructor.toKebab(state)}`, '')
			} else if (state !== '_private' && !this._state[state]) {
				this.removeAttribute(`state-${state}`)
			}
		}
	}

	_attachStyle(CSS) {
		this._style.host.setAttribute('rel', 'stylesheet')
		this._style.host.setAttribute('href', CSS)
		this._shadow.appendChild(this._style.host.cloneNode(true))

		if (typeof this._style.init !== 'undefined') {
			this._style.init.setAttribute('rel', 'stylesheet')
			this._style.init.setAttribute('href', _CSS_.init)
			this._shadow.appendChild(this._style.init.cloneNode(true))
		}

		if (typeof this._style.typography !== 'undefined') {
			this._style.typography.setAttribute('rel', 'stylesheet')
			this._style.typography.setAttribute('href', _CSS_.typography)
			this._shadow.appendChild(this._style.typography.cloneNode(true))
		}

		if (typeof this._style.grid !== 'undefined') {
			this._style.grid.setAttribute('rel', 'stylesheet')
			this._style.grid.setAttribute('href', _CSS_.grid)
			this._shadow.appendChild(this._style.grid.cloneNode(true))
		}
	}

	_attachParts() {
		for (const part in this._parts) {
			let partEl

			if (this._parts[part].all) {
				partEl = this._shadow.querySelectorAll(this._parts[part].sel)
			} else {
				partEl = this._shadow.querySelector(this._parts[part].sel)
			}

			// Check if partEl was succesfully queried
			if (partEl) {
				this._parts[part].el = partEl
			} else if (this._parts[part].optional) {
				return // Silent return if part optional flag set
			} else {
				this._throwError({ errorCase: 'targetElementNotFound', tab: { sel: this._parts[part].sel } })
			}
		}
	}

	// ------------------------------------------------------------
	// Access
	// ------------------------------------------------------------
	setProp({ prop, val, isPrivate } = { prop: '', val: '', isPrivate: false }) {
		typeof arguments[0] !== 'object' &&
			this._throwError({ errorCase: 'noArgObj', tab: { prop: 'string', val: 'string', isPrivate: 'boolean' } })

		if (!isPrivate) {
			Object.defineProperty(this._props, prop, {
				value: val
			})
		} else {
			Object.defineProperty(this._props._private, prop, {
				value: val
			})
		}

		this._pushProps()

		if (typeof this._propCallback === 'function') {
			this._propCallback(prop)
		}
	}

	setState({ state, val } = { state: '', val: '' }) {
		typeof arguments[0] !== 'object' &&
			this._throwError({
				errorCase: 'noArgObj',
				tab: { state: 'string', val: 'string' }
			})

		Object.defineProperty(this._state, state, {
			value: val
		})

		this._pushState()

		if (typeof this._stateCallback === 'function') {
			this._stateCallback(state)
		}
	}

	// ------------------------------------------------------------
	// Events
	// ------------------------------------------------------------
	_emit(ev, detail) {
		this.dispatchEvent(
			new CustomEvent(ev, {
				bubbles: true,
				composed: true,
				detail: detail
			})
		)
	}

	// ------------------------------------------------------------
	// Utils
	// ------------------------------------------------------------
	static exists(obj) {
		if (!obj) {
			return
		} else if (Object.keys(obj).length === 0) {
			return false
		} else {
			return true
		}
	}

	static sentenceToKebab(str) {
		return str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase())
	}

	static camelToSentence(str) {
		return str.replace(/-./g, (x) => x[1].toUpperCase())
	}

	static camelToSentence(str) {
		let strOut = str.replace(/([A-Z]+)*([A-Z][a-z])/g, '$1 $2').trim()
		strOut = strOut.charAt(0).toUpperCase() + strOut.slice(1)
		return strOut
	}

	static sentenceToKebab(str) {
		let strOut = str
			.replace(/([a-z])([A-Z])/g, '$1-$2')
			.replace(/[\s_]+/g, '-')
			.toLowerCase()

		return strOut
	}
}
