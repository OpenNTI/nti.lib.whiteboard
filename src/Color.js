import Logger from 'nti-util-logger';

const logger = Logger.get('lib:whiteboard:color');

/*global console*/
const HEX = /\s*#([0-9a-fA-F][0-9a-fA-F]?)([0-9a-fA-F][0-9a-fA-F]?)([0-9a-fA-F][0-9a-fA-F]?)\s*/;
const HEX16 = /^#?([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])$/i;
const HEX8 = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const RGB = /\s*rgb\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)\s*/;
const RGBA = /^rgba?\((.+?)\)$/i;
const DS_RGBA = /^(\d+(\.\d+)?) (\d+(\.\d+)?) (\d+(\.\d+)?)( (\d+(\.\d+)?))?$/i;

const colorToHexRe = /(.*?)rgb\((\d+),\s*(\d+),\s*(\d+)\)/;

const RED = Symbol('Red');
const GREEN = Symbol('Green');
const BLUE = Symbol('Blue');
const ALPHA = Symbol('Alpha');

const rgba = (...a)=> 'rgba(' + a.join(',') + ')';

export default class Color {

	constructor (r, g, b, a, toStringOverride) {
		this[RED] = r;
		this[GREEN] = g;
		this[BLUE] = b;
		this[ALPHA] = a;

		if (toStringOverride) {
			this.toString = ()=> toStringOverride;
		}
	}


	toHex () {
		let {red, green, blue} = this;
		let rgb = blue | (green << 8) | (red << 16);// eslint-disable-line no-bitwise

		return '#' + ('000000' + rgb.toString(16)).slice(-6);
	}


	toString () {
		return this.alpha == null ?
			this.toHex(this) :
			Color.toRGBA(this);
	}

	get red		() {return this[RED];	}
	get green	() {return this[GREEN];	}
	get blue	() {return this[BLUE];	}
	get alpha	() {return this[ALPHA];	}


	/**
	 *
	 * Parse the string and create a new color.
	 *
	 * Supported formats: '#rrggbb', '#rgb', and 'rgb(r,g,b)'.
	 *
	 * If the string is not recognized, an undefined will be returned instead.
	 *
	 * @param {string} str Color in string.
	 * @returns {Color} color
	 *
	 * @note from ExtJS 4.2.0 Ext.draw.Color#fromString and modified.
	 */
	static fromString (str) {
		let r, g, b;
		let dec = x => x + (x * 16);
		let par = x => parseInt(x, 16) >> 0;// eslint-disable-line no-bitwise

		let parse = x => str.length === 4 ? dec(par(x)) : par(x);

		if ((str.length === 4 || str.length === 7) && str.substr(0, 1) === '#') {

			let values = str.match(HEX);

			if (values) {
				values = values.slice(1, 4).map(x=>parse(x));
				[r, g, b] = values;
			}
		}
		else {
			let values = str.match(RGB);
			if (values) {
				[, r, g, b] = values;
			}
		}

		return (r == null) ? void 0 : new this({r, g, b});
	}


	/**
	 * Convert a color to hexadecimal format.
	 *
	 * @param {string/string[]} color The color value (i.e 'rgb(255, 255, 255)', 'color: #ffffff').
	 * Can also be an Array, in this case the function handles the first member.
	 * @returns {string} The color in hexadecimal format.
	 *
	 * @note from ExtJS 4.2.0 Ext.draw.Color#toHex and modified.
	 */
	static toHex (color) {
		if (Array.isArray(color)) {
			color = color[0];
		}

		if (typeof color !== 'string') {
			return '';
		}

		if (color.substr(0, 1) === '#') {
			return color;
		}

		let digits = colorToHexRe.exec(color);

		if (Array.isArray(digits)) {
			let prefix = digits[1];
			digits = digits.slice(2, 5).map(x=>parseInt(x, 10));

			let [red, green, blue] = digits;
			let rgb = blue | (green << 8) | (red << 16);// eslint-disable-line no-bitwise

			return prefix + '#' + ('000000' + rgb.toString(16)).slice(-6);
		}

		return color;
	}


	/**
	 * Create a new color based on the specified HSL values.
	 *
	 * @param {number} hue Hue component [0,359]
	 * @param {number} saturation Saturation component [0,1]
	 * @param {number} lightness Lightness component [0,1]
	 * @returns {Color} color
	 */
	static fromHSL (hue, saturation, lightness) {
		let rgb = [];

		if (saturation === 0 || hue == null) {
			// achromatic
			rgb = [lightness, lightness, lightness];
		}
		else {
			hue /= 60;
			// http://en.wikipedia.org/wiki/HSL_and_HSV#From_HSL

			// C is the chroma
			let C = saturation * (1 - Math.abs(2 * lightness - 1));

			// X is the second largest component
			let X = C * (1 - Math.abs(hue - 2 * Math.floor(hue / 2) - 1));

			// m is the lightness adjustment
			let m = lightness - C / 2;

			let HUE_MAP = [
				[C, X, 0],
				[X, C, 0],
				[0, C, X],
				[0, X, C],
				[X, 0, C],
				[C, 0, X]
			];

			rgb = HUE_MAP[Math.floor(hue)];


			rgb = [rgb[0] + m, rgb[1] + m, rgb[2] + m];
		}


		let [r, g, b] = rgb.map(c=> c * 255);

		return new this(r, g, b);
	}


	static toRGBA (color, alpha) {
		if (typeof color === 'string') {
			if (!(color = this.fromString(color))) {
				return 'rgba(255,255,0,1)';
			}
		}

		if (alpha == null) {
			alpha = color.alpha;
		}

		let {red, green, blue} = color;
		alpha = typeof alpha === 'number' ? alpha : 1;

		return rgba(red, green, blue, alpha);
	}


	/**
	 *
	 * @param {string} string either a 8 or 16 bit hex color, or a CSS color function (rgb() or rgba()).
	 * @param {number} [alpha] If supplied, the float will override or add alpha to this color.
	 * @returns {Color} color
	 */
	static parse (string, alpha) {

		function parseHex (cCmp, is8bit) {
			let parse = x=>parseInt(x, 16) >> 0;// eslint-disable-line no-bitwise
			let filter = x=>is8bit ? (x + (x * 16)) : x;

			cCmp = cCmp.slice(1, 4)
				.map(x=>filter(parse(x)));

			return cCmp;
		}

		function parseRGBA (c) {
			return c.map(i=> +i); //ensure they're numbers
		}

		let m = DS_RGBA.exec(string);

		if (m) {
			//console.log('DataServer color value: ',string);
			let [, r,, g,, b,,, a] = m;
			let fmt = x=> (parseFloat(x) * 255).toFixed(0);

			m = [
				+fmt(r),
				+fmt(g),
				+fmt(b),
				+a
			];
		}

		else if ((m = RGBA.exec(string))) {
			m = parseRGBA(m[1].split(','));
		}

		else if ((m = HEX16.exec(string))) {
			m = parseHex(m, false);
		}

		else if ((m = HEX8.exec(string))) {
			m = parseHex(m, true);
		}

		else {
			throw new Error(`Could not parse color: ${string}`);
		}

		m[3] = typeof alpha === 'number' ?
			alpha :
			typeof m[3] === 'number' && !isNaN(m[3]) ? m[3] : 1;


		let color = rgba(...m);

		if (m[3].toFixed(3) === '0.000') {
			color = 'None';
		}

		let [r, g, b, a] = m;

		return new this(r, g, b, a, color);
	}


	/**
	 * Converts rgba to rgb then to Hex.
	 *
	 * This is a lossy conversion, alpha is not represented in rgb, nor hex.
	 *
	 * @param {string} color a CSS rgba() color string
	 * @returns {string} a HTML color hex string
	 */
	static rgbaToHex (color) {
		let a = RGBA.exec(color);
		if (!a) {
			return color;
		}

		try {
			let c = a[1].split(',').slice(0, 3);
			let rgb = 'rgb(' + c.join(',') + ')';
			let hex = this.toHex(rgb);
			return hex;
		}
		catch (e) {
			logger.error('Error: %o', e);
		}
		return color;
	}


	/**
	 * Get a hue by index.
	 * http://ridiculousfish.com/blog/posts/colors.html
	 * @param {number} idx a number
	 * @returns {number} a hue
	 */
	static hue (idx) {
		// Here we use 31 bit numbers because JavaScript doesn't have
		// a 32bit unsigned type, and so the conversion to float would
		// produce a negative value.
		let bitcount = 31,
			ridx = 0;

		/* Reverse the bits of idx into ridx */
		for (let i = 0; i < bitcount; i++) {
			/*eslint-disable no-bitwise*/
			ridx = (ridx << 1) | (idx & 1);
			idx >>>= 1;
			/*eslint-enable no-bitwise*/
		}

		/* Divide by 2^bitcount */
		let intermediate = ridx / Math.pow(2, bitcount);

		/* Start at .561 (202 degrees) */
		return (intermediate + 0.561) % 1;
	}


	/**
	 * Given an index, this will pick a color that looks good.
	 * @param {number} idx Either the known index (a number) or
	 *					 a username with which to look up the
	 *					 index for
	 * @returns {Color} color
	 */
	static getColor (idx) {
		return this.fromHSL(Math.round(this.hue(idx) * 360), 0.91, 0.606);
	}
}
