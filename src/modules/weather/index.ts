import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import config from "@/config.js";
import Denchat from "../denchat/index.js";

export default class extends Module {
	public readonly name = "weather";

	private hourMorning = Number.parseInt(config.weatherTimeMorning ?? '7', 10);
	private hourNight = Number.parseInt(config.weatherTimeNight ?? '21', 10);

	@bindThis
	public install() {
		setInterval(
			async () => {
				const now = new Date();
				const hour = now.getHours();
				const minute = now.getMinutes();

				const isTargetHour = hour === this.hourMorning || hour === this.hourNight;
				const isTargetMinute = minute >= 0 && minute < 10;

				if (isTargetHour && isTargetMinute) {
					await this.post(hour);
				}
			},
			1000 * 60 * 10,
		);

		return {};
	}

	@bindThis
	private async post(hour: number) {
		if (!(hour === this.hourMorning || hour === this.hourNight)) return;
		
		const denchatModule = this.subaru.modules.find((m) => m.name === 'denchat') as Denchat;
	
		return await denchatModule.weather((config.weatherArea && config.weatherArea.trim()) || '東京', (hour === this.hourMorning) ? '今日' : '明日');
	}
}
