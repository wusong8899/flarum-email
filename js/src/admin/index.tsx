import app from 'flarum/admin/app';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Component from 'flarum/common/Component';
import m, { Vnode } from 'mithril';

export { default as extend } from './extend';

class EmailExportButton extends Component {
  private loading = false;
  private exportCount: number | null = null;
  private lastExportDate: string | null = null;

  oninit(vnode: Vnode) {
    super.oninit(vnode);
    // 从 localStorage 恢复上次导出信息
    const lastExport = localStorage.getItem('wusong8899_email_last_export');
    if (lastExport) {
      try {
        const data = JSON.parse(lastExport);
        this.exportCount = data.count;
        this.lastExportDate = data.date;
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  view(): Vnode {
    return (
      <div className="Form-group">
        <label>导出有效邮箱</label>
        <p className="helpText">
          点击导出所有通过 RFC + DNS 检查的唯一邮箱，每行一个。
          {this.exportCount !== null && this.lastExportDate && (
            <span className="helpText-success">
              <br />上次导出: {this.exportCount} 个邮箱 ({this.formatDate(this.lastExportDate)})
            </span>
          )}
        </p>
        <Button
          className="Button Button--primary"
          type="button"
          onclick={() => this.handleExport()}
          disabled={this.loading}
          loading={this.loading}
        >
          {this.loading ? '导出中...' : '导出邮箱'}
        </Button>
      </div>
    );
  }

  private async handleExport() {
    console.log('Export button clicked');
    if (this.loading) return;

    this.loading = true;
    m.redraw();

    try {
      console.log('Making request to:', app.forum.attribute('apiUrl') + '/admin-email-export');
      const response = await app.request({
        method: 'GET',
        url: app.forum.attribute('apiUrl') + '/admin-email-export',
        responseType: 'text'
      });

      // 创建 Blob 并下载
      const blob = new Blob([response as string], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `valid-emails-${date}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // 计算导出的邮箱数量
      const lines = (response as string).trim().split('\n').filter((line: string) => line.trim());
      this.exportCount = lines.length;
      this.lastExportDate = new Date().toISOString();

      // 保存到 localStorage
      localStorage.setItem('wusong8899_email_last_export', JSON.stringify({
        count: this.exportCount,
        date: this.lastExportDate
      }));

      app.alerts.show(
        { type: 'success' },
        `成功导出 ${this.exportCount} 个有效邮箱！`
      );
    } catch (error) {
      console.error('Export failed:', error);

      let errorMessage = '导出失败，请稍后重试';
      if ((error as any).status === 403) {
        errorMessage = '权限不足，只有管理员可以导出邮箱';
      } else if ((error as any).status === 500) {
        errorMessage = '服务器错误，请检查 PHP Intl 扩展是否已安装';
      } else if ((error as any).status === 204) {
        errorMessage = '没有找到有效的邮箱地址';
      }

      app.alerts.show(
        { type: 'error' },
        errorMessage
      );
    } finally {
      this.loading = false;
      m.redraw();
    }
  }

  private formatDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      };
      return date.toLocaleString('zh-CN', options);
    } catch (e: any) {
      return isoString;
    }
  }
}

app.initializers.add('wusong8899-email', () => {
  app.extensionData.for('wusong8899-email').registerSetting(function() {
    return <EmailExportButton />;
  });
});
