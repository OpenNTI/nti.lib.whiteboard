import Color from '../Color';

describe('Check Color Utility Functions', () => {

	it('does rgb string result in correct object?', () => {
		let fillColor = 'rgb(0,0,0)',
			result;

		result = Color.parse(fillColor);
		expect(result).toBeTruthy();
		expect(result.red).toBe(0);
		expect(result.green).toBe(0);
		expect(result.blue).toBe(0);
		expect(result.toString()).toEqual('rgba(0,0,0,1)');
	});


	it('does rgb string and opacity result in correct object?', () => {
		let fillColor = 'rgb(0,0,0)',
			fillOpacity = 1,
			result;

		result = Color.parse(fillColor, fillOpacity);
		expect(result).toBeTruthy();
		expect(result.red).toBe(0);
		expect(result.green).toBe(0);
		expect(result.blue).toBe(0);

		expect(result.toString()).toEqual('rgba(0,0,0,1)');
	});

	it('does rgb string and opacity result in correct object 2?', () => {
		let fillColor = 'rgba(0,0,0,1)',
			result;

		result = Color.parse(fillColor);
		expect(result).toBeTruthy();
		expect(result.red).toBe(0);
		expect(result.green).toBe(0);
		expect(result.blue).toBe(0);

		expect(result.toString()).toEqual('rgba(0,0,0,1)');
	});
});
