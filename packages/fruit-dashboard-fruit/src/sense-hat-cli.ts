import {z} from 'zod';
import {camelCase} from 'lodash';
import {execAsync} from "./utils";

export const Vector2D = z.object({
	x: z.number(),
	y: z.number(),
	z: z.number()
});
export type Vector2D = z.infer<typeof Vector2D>;

function parseVector2D(vectorString: string): Vector2D {
	const [x, y, z] = vectorString.split(/\s*,\s*/).map(n => parseFloat(n));

	return { x, y, z };
}

export const SenseHatCliRawOutput = z.object({
	humidity: z.string(),
	pressure: z.string(),
	temperatureFromHumidity: z.string(),
	temperatureFromPressure: z.string(),
	angularRate: z.string(),
	linearAcceleration: z.string(),
	magneticField: z.string(),
	ledsUpdated: z.string().optional()
}).partial();
export type SenseHatCliRawOutput = z.infer<typeof SenseHatCliRawOutput>;

export const SenseHatCliOutput = z.object({
	humidity: z.string().transform(reading => parseFloat(reading.split(' ')[0])),
	pressure: z.string().transform(reading => parseFloat(reading.split(' ')[0])),
	temperatureFromHumidity: z.string().transform(reading => parseFloat(reading.split(' ')[0])),
	temperatureFromPressure: z.string().transform(reading => parseFloat(reading.split(' ')[0])),
	angularRate: z.string().transform(reading => parseVector2D(reading.split(' ')[0])),
	linearAcceleration: z.string().transform(reading => parseVector2D(reading.split(' ')[0])),
	magneticField: z.string().transform(reading => parseVector2D(reading.split(' ')[0])),
	ledsUpdated: z.string().transform(reading => reading === 'OK' ? 'OK' : 'FAILED').optional()
});
export type SenseHatCliOutput = z.infer<typeof SenseHatCliOutput>;

export class SenseHatCli {
	private readonly path: string;

	constructor(path = "sense-hat-cli") {
		this.path = path;
	}

	async run(): Promise<SenseHatCliOutput> {
		const processOutput = await execAsync(this.path);
		const lines = processOutput.stdout.split('\n');

		const measurement = lines.reduce((acc, line) => {
			const [key, reading] = line.split('\t');
			acc[camelCase(key) as keyof SenseHatCliRawOutput] = reading;
			return acc;
		}, {} as SenseHatCliRawOutput);

		return SenseHatCliOutput.parse(measurement);
	}

	async updateLeds(leds: number[]): Promise<void> {
		await execAsync(this.path, ['--leds', leds.join(' '), '--no-sensors']);
	}
}
