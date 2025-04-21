import React from 'react';
import { atom } from '@reatom/framework';
import { useAtom, useCtx } from '@reatom/npm-react';

type CreateContexts = {
  <T extends Record<string, () => Record<string, unknown>>>(
    contextsHook: T,
  ): {
    // @ts-expect-error bad type inference
    [K in keyof T as `use${K}Context`]: {
      (): ReturnType<T[K]>;
      <Prop extends keyof ReturnType<T[K]>>(prop: Prop): ReturnType<T[K]>[Prop];
      <Selected>(selector: (state: ReturnType<T[K]>) => Selected): Selected;
      Provider: React.FC<React.PropsWithChildren>;
    };
  };
};

const NEVER_VALUE = {};

// @ts-expect-error generic mismatch
export const createContexts: CreateContexts = (contextsHook) => {
  const result: Record<string, () => unknown> = {};

  for (const [name, useContextLogic] of Object.entries(contextsHook)) {
    const hookName = `use${name}Context`;
    const providerName = `${name}Provider`;
    const context = React.createContext(NEVER_VALUE as ReturnType<typeof useContextLogic>);
    const contextAtom = atom(NEVER_VALUE as ReturnType<typeof useContextLogic>, `${name}Atom`);
    const Provider = ({ children }: React.PropsWithChildren): React.JSX.Element => {
      const state = useContextLogic();
      const value = React.useMemo(
        () => state,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        Object.values(state),
      );
      const ctx = useCtx();
      if (ctx.get(contextAtom) !== value) {
        contextAtom(ctx, value);
      }
      return React.createElement(context.Provider, {
        value,
        children,
      });
    };
    Provider.displayName = providerName;

    result[hookName] = Object.assign(
      (selector?: string | ((state: ReturnType<typeof useContextLogic>) => unknown)) => {
        if (selector) {
          return useAtom(
            (ctx) => {
              const state = ctx.spy(contextAtom);
              return typeof selector === 'function' ? selector(state) : state[selector];
            },
            [],
            { name: `${name}.useAtom._selector` },
          )[0];
        }
        const value = React.useContext(context);
        if (!value || value === NEVER_VALUE) {
          throw new Error(`${hookName} must be used within a ${providerName}`);
        }
        return value;
      },
      {
        Provider,
      },
    );
  }

  return result;
};