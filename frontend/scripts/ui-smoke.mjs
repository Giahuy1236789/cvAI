import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

let savedUser = null;
globalThis.localStorage = { getItem: key => key === 'user' && savedUser ? JSON.stringify(savedUser) : null };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { AuthProvider } = await server.ssrLoadModule('/src/context/AuthContext.jsx');
  const { default: Navbar } = await server.ssrLoadModule('/src/components/common/Navbar.jsx');
  const { default: HomePage } = await server.ssrLoadModule('/src/pages/HomePage.jsx');
  const { default: LoginPage } = await server.ssrLoadModule('/src/pages/auth/LoginPage.jsx');
  const { default: RegisterPage } = await server.ssrLoadModule('/src/pages/auth/RegisterPage.jsx');
  const render = (Component, route = '/') => renderToStaticMarkup(
    React.createElement(AuthProvider, null,
      React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(Component)))
  );
  const publicMenu = render(Navbar);
  assert.match(publicMenu, /href="\/#ai-tools"/, 'Public menu links to AI tools');
  assert.match(publicMenu, /Công cụ AI/, 'Public AI entry remains visible');
  savedUser = { id: 'smoke-student', role: 'student', fullName: 'UI Review' };
  const studentMenu = render(Navbar, '/recommendations');
  assert.match(studentMenu, /href="\/recommendations"/, 'Student has recommendation route');
  assert.match(studentMenu, /Gợi ý việc làm AI/, 'Student recommendation label says AI');
  assert.match(studentMenu, /Phân tích CV AI/, 'Student analyzer label says AI');
  assert.match(studentMenu, /href="\/cv-analyzer"/, 'Student has analyzer route');
  assert.match(studentMenu, /aria-current="page"/, 'Active route is indicated');
  const studentHome = render(HomePage);
  assert.match(studentHome, /href="\/cv-analyzer"/);
  assert.match(studentHome, /href="\/recommendations"/);
  savedUser = { id: 'smoke-recruiter', role: 'recruiter', fullName: 'UI Review' };
  assert.match(render(HomePage), /href="\/recruiter\/dashboard"/, 'Recruiter opens the correct workspace');
  assert.doesNotMatch(render(Navbar), /href="\/cv-analyzer"/, 'Role restrictions remain intact');
  savedUser = { id: 'smoke-admin', role: 'admin', fullName: 'UI Review' };
  assert.match(render(HomePage), /href="\/admin\/dashboard"/);
  savedUser = null;
  assert.match(render(LoginPage, '/login'), /autocomplete="current-password"/i);
  assert.match(render(RegisterPage, '/register'), /Vai trò tài khoản/);
  assert.match(render(RegisterPage, '/register'), /Nhà tuyển dụng/);
  console.log('PASS: AI entry points, active navigation, role workspaces, and auth form rendering.');
  console.log('Server rendering only; no browser layout checks or AI inference calls.');
} finally {
  delete globalThis.localStorage;
  await server.close();
}
