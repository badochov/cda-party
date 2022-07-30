test('browser is defined in the global scope', () => {
  expect(browser).toBeDefined();
  expect(browser.runtime).toBeDefined();
  // This will be undefined if no mock implementation is provided
  expect(browser.runtime.sendMessage).toBeUndefined();
});

test('chrome is mocked in the global scope', () => {
  expect(chrome).toBeDefined();
  expect(chrome.runtime).toBeDefined();
  expect(chrome.runtime.sendMessage).toBeDefined();
});
