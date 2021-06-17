export declare type ExtensionHook<T, R = any> = (options: R) => ExtensionHookResult<T>;
export declare type ExtensionHookResult<T> = [T, boolean, any];
export declare type ExtensionK8sModel = {
    group: string;
    version: string;
    kind: string;
};
export declare type ExtensionK8sGroupModel = {
    group: string;
    version?: string;
    kind?: string;
};