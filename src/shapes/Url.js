import Base from './Base';
import {getOrientationTransform} from '../utils';

const BROKEN_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAO8AAADvCA' +
					'MAAAAtrnOLAAABX1BMVEXc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nz' +
					'c3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc' +
					'3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3' +
					'Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N' +
					'zc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nz' +
					'c3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc' +
					'3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3' +
					'Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N' +
					'zc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nwy830CAAAAdHRSTlMA7hn+/QU' +
					'YAwRI09LzFvkX9babpXPstRvL611uYhTWJVnjcEMTmgLXCWNAux5+z6pG' +
					'J/ug+vzx8hUiZ1iheEFlKlz0NnJHPpKTDtTOUjWDUxpksj2CkDnByAqrl' +
					'o0ob4dqn2l573bo7VY48DQHMq/4wL/i4WXOVg0AAAItSURBVHhe7dlFb+' +
					'VAFAXhk8dhZmZmziAzMzMz3P+vseznxFFmImUXXde36rOsXbdaFpNnFkt' +
					'hr9KDXn/odYNeekMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
					'ADsweg8Leuk9WAG9hxO99PYeXVtvrk1N79dqC/RNpKW3y0KTaem9Z6GLa' +
					'ek9ZqHZtPRu1lmgbnFPQEtra4vDXt2oMTs9sCfgrAWGHPaq98hA/Z6AmQ' +
					'YLNMyk5b7x2ELzKeldsLJhn735U7NnknPcysbzHnsXr5jlerTtnW1rcdh' +
					'buW6B7Md4t9cEsyJgZjXt7npPLFmo4ZsizRa4JOUt0CxpyVPvVtbKBmsV' +
					'0PFwbEr1Fsiely446q1ctW0PH0kqVYXjmnQyPFSVNNLqpvdmpyU0TkhD0' +
					'TgnTVmoW+r20lt8YEmXSyqsRaNLumqhzwWV+pz0XrddFqRlizyXbllkWa' +
					'r00Tu1akm3pTtZi9yV3lgke19q89A7MmhJK/0qzsXjifTUyuaKeuahd7R' +
					'ilxfSS4vNS68s9lpy+V7YeGuxzunp9xb7sOGzt8n+o8nf/29VUZ9yO7Mx' +
					'k2ncWbkv7nqHNdaRmBkpk5gdY856v0uTtru3kNw9vnp/9EvVltBWaG9L7' +
					'mq5s2L7qJM7P20fv+ROfdPvnP1T7s9orQIAAAAAAAAAAAAAAAAAAAAAAA' +
					'AAAAAAAAAAAAAAAAAAALNUxdLrDb1+0EtvTJ5ZJH29fwF43w2VmdY1pAA' +
					'AAABJRU5ErkJggg==';

export default class Url extends Base {

	constructor (config) {
		super(config, ['url']);
	}


	getTransformMatrix (ctx) {
		let m = super.getTransformMatrix(ctx);

		if (this.auxTransform) {
			m.multiply(this.auxTransform);//the matrix is a new instance every invocation of the super.
			//TODO: refactor the Matrix class to be immutable.
		}

		return m;
	}


	draw (ctx, drawNext) {
		let image = this.cache.url || null;

		if (!image) {
			if (!this.url) {
				drawNext();
				return;
			}


			image = new Image();
			image.onload = ()=>getOrientationTransform(image)
								.catch(() => null)
								.then(transform => {
									this.auxTransform = transform;
									this.draw(ctx, drawNext);
								});
			image.onerror = ()=>this.imageFailed(image, ctx, drawNext);
			this.cache.url = image;
			image.src = this.url;
			return;
		}

		super.draw(ctx);
		let w = image.naturalWidth || image.width;
		let h = image.naturalHeight || image.height;
		let x = -w / 2;
		let y = -h / 2;
		ctx.drawImage(image, x, y);
		this.bbox = {x: x, y: y, w: w, h: h};

		if (this.selected === 'Hand') {
			this.showNibs(ctx);
		}

		drawNext();
	}


	imageFailed (image, ctx, cb) {
		if (this.url !== BROKEN_IMAGE) {
			image.src = BROKEN_IMAGE;
			return;
		}

		cb.call(this);
	}
}
