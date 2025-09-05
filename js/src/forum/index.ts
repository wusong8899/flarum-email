import app from 'flarum/forum/app';

export { default as extend } from './extend';

app.initializers.add('wusong8899-email', () => {
  console.log('[wusong8899/flarum-email] Hello, forum!');
});
