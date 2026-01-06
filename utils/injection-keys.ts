/**
 * Type-safe injection keys for provide/inject pattern
 */
import type { InjectionKey, Ref } from "vue";

export const triggerShakeKey: InjectionKey<() => void> = Symbol("triggerShake");
export const setModalOpenKey: InjectionKey<(open: boolean) => void> = Symbol("setModalOpen");
export const isModalOpenKey: InjectionKey<Ref<boolean>> = Symbol("isModalOpen");
