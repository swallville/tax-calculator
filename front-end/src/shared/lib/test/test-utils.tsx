import { render as renderTest } from '@testing-library/react';
import React from 'react';

export * from '@testing-library/react';

const WithProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const render = (
  component: React.ReactElement,
  options?: Parameters<typeof renderTest>[1],
) => {
  return renderTest(component, { wrapper: WithProviders, ...options });
};

export { render };
