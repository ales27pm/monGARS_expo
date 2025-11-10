declare const jest: {
  fn: (...args: any[]) => any;
  mock: (...args: any[]) => any;
  spyOn: (...args: any[]) => { mockImplementation: (...args: any[]) => any; mockRestore: () => void };
  clearAllMocks: () => void;
};

declare function describe(name: string, fn: () => void | Promise<void>): void;
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function expect(actual: any): any;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function afterEach(fn: () => void | Promise<void>): void;
