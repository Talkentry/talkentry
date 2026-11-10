import { act, type ReactElement } from 'react';

export type TestInstance = {
  props: Record<string, unknown>;
  findByType: (type: unknown) => TestInstance;
  findAllByType: (type: unknown) => TestInstance[];
};

export type TestRenderer = {
  root: TestInstance;
  update: (element: ReactElement) => void;
  unmount: () => void;
  toJSON: () => unknown;
};

const renderer = require('react-test-renderer') as {
  create: (element: ReactElement) => TestRenderer;
};

const mounted: TestRenderer[] = [];

export const render = async (element: ReactElement): Promise<TestRenderer> => {
  let result!: TestRenderer;

  await act(async () => {
    result = renderer.create(element);
  });
  mounted.push(result);

  return result;
};

afterEach(async () => {
  await act(async () => {
    mounted.splice(0).forEach((value) => value.unmount());
  });
});

export { act };
