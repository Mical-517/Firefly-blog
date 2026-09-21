/**
 * SettingsStore —— 设置存储的唯一 seam（ADR-0002）。
 *
 * 只负责"身份 → localStorage"的读写与变更通知；不触碰 DOM。
 * DOM 应用在 setting-utils.ts；pre-paint 由 prepaint.ts 从注册表生成。
 */
import { getSettingDefinition, type SettingValue } from "./registry";

export const SETTING_CHANGE_EVENT = "firefly:setting-change";

export interface SettingChangeDetail {
	id: string;
	value: SettingValue;
}

function hasLocalStorage(): boolean {
	return (
		typeof localStorage !== "undefined" &&
		typeof localStorage.getItem === "function" &&
		typeof localStorage.setItem === "function"
	);
}

/** 读取一个设置项：存储值 → parse（含兜底），无存储时回落到注册表默认值 */
export function readSetting<T extends SettingValue>(id: string): T {
	const def = getSettingDefinition(id);
	if (!def) {
		throw new Error(`Unknown setting: ${id}`);
	}
	if (!hasLocalStorage()) {
		return def.fallback() as T;
	}
	return def.parse(localStorage.getItem(def.storageKey)) as T;
}

/** 读取原始存储字符串（null = 未设置） */
export function readRawSetting(id: string): string | null {
	const def = getSettingDefinition(id);
	if (!def || !hasLocalStorage()) {
		return null;
	}
	return localStorage.getItem(def.storageKey);
}

/** 写入一个设置项（序列化后落盘）并广播变更 */
export function writeSetting<T extends SettingValue>(id: string, value: T): void {
	const def = getSettingDefinition(id);
	if (!def) {
		throw new Error(`Unknown setting: ${id}`);
	}
	if (hasLocalStorage()) {
		localStorage.setItem(def.storageKey, def.serialize(value));
	}
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent<SettingChangeDetail>(SETTING_CHANGE_EVENT, {
				detail: { id, value },
			}),
		);
	}
}

/** 清除一个设置项的存储值（回落默认） */
export function clearSetting(id: string): void {
	const def = getSettingDefinition(id);
	if (!def) {
		throw new Error(`Unknown setting: ${id}`);
	}
	if (hasLocalStorage()) {
		localStorage.removeItem(def.storageKey);
	}
}

/** 订阅一个设置项的变更；返回取消订阅函数 */
export function subscribeSetting(
	id: string,
	listener: (value: SettingValue) => void,
): () => void {
	if (typeof window === "undefined") {
		return () => {};
	}
	const handler = (event: Event) => {
		const detail = (event as CustomEvent<SettingChangeDetail>).detail;
		if (detail?.id === id) {
			listener(detail.value);
		}
	};
	window.addEventListener(SETTING_CHANGE_EVENT, handler);
	return () => window.removeEventListener(SETTING_CHANGE_EVENT, handler);
}
