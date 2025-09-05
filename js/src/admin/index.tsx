import app from 'flarum/admin/app';
import Button from 'flarum/common/components/Button';

export { default as extend } from './extend';

app.initializers.add('wusong8899-email', () => {
  app.extensionData.for('wusong8899-email').registerSetting(function() {
    const handleExport = () => {
      const url = app.forum.attribute('apiUrl') + '/admin-email-export';
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
      <div className="Form-group">
        <label>导出有效邮箱</label>
        <p className="helpText">点击导出所有通过 RFC + DNS 检查的唯一邮箱，每行一个。</p>
        <Button className="Button Button--primary" type="button" onclick={handleExport}>
          导出邮箱
        </Button>
      </div>
    );
  });
});
