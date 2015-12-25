import Matrix from '../Matrix';
import {toRadians} from '../utils';

const TWO_PI = 2 * Math.PI;

describe('Whiteboard Matrix Utility Class Tests', ()=> {

	it('should test an identity matrix', ()=> {
		let matrix = new Matrix();
		let m = matrix.toTransform();

		expect(m.a).toBe(1);
		expect(m.b).toBe(0);
		expect(m.c).toBe(0);
		expect(m.d).toBe(1);
		expect(m.tx).toBe(0);
		expect(m.ty).toBe(0);
	});


	it('should init with a matrix', ()=> {
		let matrix = new Matrix({a: 1, b: 0, c: 0, d: 1, tx: 120, ty: 80});

		let m = matrix.toTransform();

		expect(m.a).toBe(1);
		expect(m.b).toBe(0);
		expect(m.c).toBe(0);
		expect(m.d).toBe(1);
		expect(m.tx).toBe(120);
		expect(m.ty).toBe(80);


		let translation = matrix.getTranslation();
		let rotation = matrix.getRotation();
		let scale = matrix.getScale();

		expect(translation[0]).toBe(120);
		expect(translation[1]).toBe(80);
		expect(rotation).toBe(0);
		expect(scale[0]).toBe(1);
		expect(scale[1]).toBe(1);
	});


	it('should rotate', ()=> {

		let matrix = new Matrix();

		let step = Math.PI / 4;

		let getTarget = i=> i * step;

		expect(matrix.toTransform().a).toBe(1);
		expect(matrix.toTransform().b).toBeCloseTo(0, 4);
		expect(matrix.toTransform().c).toBeCloseTo(0, 4);
		expect(matrix.toTransform().d).toBe(1);

		for (let steps = 0; steps < 8; steps++) {

			let rad = matrix.getRotation();

			if (rad < 0) { rad += TWO_PI; }//account for the values after PI become negative

			expect(rad).toBeCloseTo(getTarget(steps), 4);

			matrix.rotate(step);

			rad = matrix.getRotation(); //should always be (-2PI, 2PI), both -2PI and 2PI should be represented as 0.

			if (rad < 0) { rad += TWO_PI; }

			expect(rad).toBeCloseTo(getTarget(steps + 1), 4);
		}
	});


	it('should scale by 2', ()=> {
		let t = {
			a: 0.1342,
			b: 0.2324,
			c: 0.2344,
			d: 0.34221,
			tx: 0.45563,
			ty: 0.235667
		};

		let matrix = new Matrix(t);

		matrix.scale(2);

		let m = matrix.toTransform();
		expect(m.a).toBeCloseTo(t.a * 2, 4);
		expect(m.d).toBeCloseTo(t.d * 2, 4);
		expect(m.c).toBeCloseTo(t.c * 2, 4);
		expect(m.b).toBeCloseTo(t.b * 2, 4);
	});


	it('should translate by (23,57)', ()=> {
		let t = {a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0};
		let matrix = new Matrix(t);

		matrix.translate(23, 57);

		let m = matrix.toTransform();
		expect(m.tx).toBe(23);
		expect(m.ty).toBe(57);
		expect(m.a).toBe(t.a);
		expect(m.b).toBe(t.b);
	});


	it('should translate by (10,20), scale by 2.5, then rotate completely around', ()=> {
		const f = 2.5;
		let t = {a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0};
		let matrix = new Matrix(t);

		let step = Math.PI / 4;

		let getTarget = i => i * step;

		matrix.translate(10, 20);
		matrix.scale(f);

		for (let steps = 0; steps < 8; steps++) {
			matrix.rotate(step);
			let scale = matrix.getScale();
			let trans = matrix.getTranslation();

			expect(scale[0]).toBeCloseTo(f, 4);
			expect(scale[1]).toBeCloseTo(f, 4);
			expect(trans[0]).toBe(10);
			expect(trans[1]).toBe(20);

			let rad = matrix.getRotation();
			if (rad < 0) { rad += TWO_PI; }

			expect(rad).toBeCloseTo(getTarget(steps + 1), 4);
		}

	});


	it('should rotate by 120, then scale by 0.45', ()=> {
		const f = 0.45;
		let t = {a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0};
		let matrix = new Matrix(t);
		let rad = toRadians(120);

		matrix.rotate(rad);
		matrix.scale(f);
		let m = matrix.toTransform();

		expect(m.a).toBeCloseTo(t.a * f * Math.cos(rad), 4);
		expect(m.b).toBeCloseTo(f * Math.sin(rad), 4);
		expect(m.c).toBeCloseTo(f * -Math.sin(rad), 4);
		expect(m.d).toBeCloseTo(t.d * f * Math.cos(rad), 4);
	});

});
