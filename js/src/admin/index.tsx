import app from 'flarum/admin/app';

export { default as extend } from './extend';

app.initializers.add('wusong8899-email', () => {
  app.extensionData.for('wusong8899-email').registerSetting(function() {
    const onclick = () => {
      const url = app.forum.attribute('baseUrl') + '/api/admin-email-export';
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
    };

    return (
      <div className="Form-group">
        <label>导出有效邮箱</label>
        <p className="helpText">点击导出所有通过 RFC + DNS 检查的唯一邮箱，每行一个。</p>
        <button className="Button Button--primary" type="button" onClick={onclick}>
          导出邮箱
        </button>
      </div>
    );
  });
});
