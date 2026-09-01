// scripts/prepare.js
// github 源安装时 pnpm 在隔离临时目录跑 prepare：仅装本包 deps，不装 peerDependencies，
// 因此 tsc 缺 @deepseek-ai/* 类型会失败。lib/ 已预提交到 git，tarball 自带产物，
// 检测 lib/index.js 存在则跳过构建直接装配载；本地开发 clone 后无 lib 才构建。
import { existsSync } from 'node:fs';

if (existsSync(new URL('../lib/index.js', import.meta.url))) {
  console.log('prepare: lib/ 已存在（github 源 tarball 预提交产物），跳过构建');
  process.exit(0);
}
console.log('prepare: lib/ 缺失，执行 pnpm build');
const { execSync } = await import('node:child_process');
execSync('pnpm build', { stdio: 'inherit' });
