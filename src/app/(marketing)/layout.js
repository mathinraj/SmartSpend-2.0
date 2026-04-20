import MarketingNav from '../../components/MarketingNav';
import MarketingFooter from '../../components/MarketingFooter';
import './marketing.css';

export default function MarketingLayout({ children }) {
  return (
    <div className="marketing-page">
      <MarketingNav />
      <div className="marketing-content">
        {children}
      </div>
      <MarketingFooter />
    </div>
  );
}
