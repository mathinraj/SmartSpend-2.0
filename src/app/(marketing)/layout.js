import MarketingNav from '../../components/MarketingNav';
import MarketingFooter from '../../components/MarketingFooter';
import { siteFont } from '../../utils/siteFont';
import '../../components/SiteTheme.css';
import './marketing.css';

export default function MarketingLayout({ children }) {
  return (
    <div className={`st-root marketing-page ${siteFont.variable}`}>
      <MarketingNav />
      <div className="marketing-content">
        {children}
      </div>
      <MarketingFooter />
    </div>
  );
}
