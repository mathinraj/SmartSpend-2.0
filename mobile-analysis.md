Report from Apr 20, 2026, 2:37:25 PM
https://spendtrak.vercel.app/
Enter a valid URL


smartphone
Mobile

computer
Desktop

Discover what your real users are experiencing
No Data

Diagnose performance issues
86
Performance
92
Accessibility
100
Best Practices
100
SEO
86
FCP
+5
LCP
+17
TBT
+30
CLS
+25
SI
+8
Performance
Values are estimated and may vary. The performance score is calculated directly from these metrics.See calculator.
0–49
50–89
90–100
Final Screenshot

Metrics
Expand view
First Contentful Paint
2.9 s
Largest Contentful Paint
3.3 s
Total Blocking Time
50 ms
Cumulative Layout Shift
0
Speed Index
3.9 s
Captured at Apr 20, 2026, 2:37 PM GMT+5:30
Emulated Moto G Power with Lighthouse 13.0.1
Single page session
Initial page load
Slow 4G throttling
Using HeadlessChromium 146.0.7680.177 with lr
View Treemap
Screenshot
Screenshot
Screenshot
Screenshot
Screenshot
Screenshot
Screenshot
Screenshot
Show audits relevant to:

All

FCP

LCP

TBT

CLS
Insights
Render blocking requests Est savings of 150 ms
Requests are blocking the page's initial render, which may delay LCP. Deferring or inlining can move these network requests out of the critical path.LCPFCPUnscored
URL
Transfer Size
Duration
vercel.app 1st party
8.2 KiB	680 ms
…css/551057aa7587b401.css(spendtrak.vercel.app)
1.1 KiB
170 ms
…css/8e71716977a66c85.css(spendtrak.vercel.app)
7.1 KiB
510 ms
Legacy JavaScript Est savings of 12 KiB
Polyfills and transforms enable older browsers to use new JavaScript features. However, many aren't necessary for modern browsers. Consider modifying your JavaScript build process to not transpile Baseline features, unless you know you must support older browsers. Learn why most sites can deploy ES6+ code without transpilingLCPFCPUnscored
URL
Wasted bytes
vercel.app 1st party
11.5 KiB
…chunks/255-091853b4155593e2.js(spendtrak.vercel.app)
11.5 KiB
…chunks/255-091853b4155593e2.js:1:143260(spendtrak.vercel.app)
Array.prototype.at
…chunks/255-091853b4155593e2.js:1:142648(spendtrak.vercel.app)
Array.prototype.flat
…chunks/255-091853b4155593e2.js:1:142761(spendtrak.vercel.app)
Array.prototype.flatMap
…chunks/255-091853b4155593e2.js:1:143137(spendtrak.vercel.app)
Object.fromEntries
…chunks/255-091853b4155593e2.js:1:143395(spendtrak.vercel.app)
Object.hasOwn
…chunks/255-091853b4155593e2.js:1:142390(spendtrak.vercel.app)
String.prototype.trimEnd
…chunks/255-091853b4155593e2.js:1:142305(spendtrak.vercel.app)
String.prototype.trimStart
Forced reflow
A forced reflow occurs when JavaScript queries geometric properties (such as offsetWidth) after styles have been invalidated by a change to the DOM state. This can result in poor performance. Learn more about forced reflows and possible mitigations.Unscored
Source
Total reflow time
[unattributed]
118 ms
Network dependency tree
Avoid chaining critical requests by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load.LCPUnscored
Maximum critical path latency: 721 ms
Initial Navigation
https://spendtrak.vercel.app - 361 ms, 5.14 KiB
…css/551057aa7587b401.css(spendtrak.vercel.app) - 721 ms, 1.11 KiB
…css/8e71716977a66c85.css(spendtrak.vercel.app) - 721 ms, 7.11 KiB
Preconnected origins
preconnect hints help the browser establish a connection earlier in the page load, saving time when the first request for that origin is made. The following are the origins that the page preconnected to.
no origins were preconnected
Preconnect candidates
Add preconnect hints to your most important origins, but try to use no more than 4.
No additional origins are good candidates for preconnecting
Use efficient cache lifetimes Est savings of 6 KiB
A long cache lifetime can speed up repeat visits to your page. Learn more about caching.LCPFCPUnscored
Request
Cache TTL
Transfer Size
FontAwesome CDN cdn 
6 KiB
/5432a717c1.js(kit.fontawesome.com)
1m
6 KiB
brandfetch.io
2 KiB
…type/icon?c=1idk2CDIjqzrcJXEJcm(cdn.brandfetch.io)
1d
2 KiB
Font display Est savings of 20 ms
Optimize DOM size
A large DOM can increase the duration of style calculations and layout reflows, impacting page responsiveness. A large DOM will also increase memory usage. Learn how to avoid an excessive DOM size.Unscored
Statistic
Element
Value
Total elements
184
DOM depth
Add your accounts
<h3 class="landing-step-title">
9
Most children
body
<body>
13
LCP breakdown
Each subpart has specific improvement strategies. Ideally, most of the LCP time should be spent on loading the resources, not within delays.LCPUnscored
Subpart
Duration
Time to first byte
0 ms
Element render delay
1,900 ms
The smartest way to track expenses, manage accounts, and take full control of y…
<p class="landing-desc">
3rd parties
3rd party code can significantly impact load performance. Reduce and defer loading of 3rd party code to prioritize your page's content.Unscored
3rd party
Transfer size
Main thread time
FontAwesome CDN cdn 
191 KiB	9 ms
/5432a717c1.js(kit.fontawesome.com)
6 KiB
9 ms
…webfonts/free-fa-solid-900.woff2(ka-f.fontawesome.com)
156 KiB
0 ms
…css/free.min.css?token=5432a717c1(ka-f.fontawesome.com)
22 KiB
0 ms
…css/free-v4-shims.min.css?token=5432a717c1(ka-f.fontawesome.com)
5 KiB
0 ms
…css/free-v4-font-face.min.css?token=5432a717c1(ka-f.fontawesome.com)
2 KiB
0 ms
…css/free-v5-font-face.min.css?token=5432a717c1(ka-f.fontawesome.com)
1 KiB
0 ms
brandfetch.io
2 KiB	0 ms
…type/icon?c=1idk2CDIjqzrcJXEJcm(cdn.brandfetch.io)
2 KiB
0 ms
These insights are also available in the Chrome DevTools Performance Panel - record a trace to view more detailed information.
Diagnostics
Reduce unused JavaScript Est savings of 22 KiB
Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. Learn how to reduce unused JavaScript.LCPFCPUnscored
URL
Transfer Size
Est Savings
vercel.app 1st party
44.8 KiB	22.0 KiB
…chunks/255-091853b4155593e2.js(spendtrak.vercel.app)
44.8 KiB
22.0 KiB
Reduce unused CSS Est savings of 14 KiB
Reduce unused rules from stylesheets and defer CSS not used for above-the-fold content to decrease bytes consumed by network activity. Learn how to reduce unused CSS.LCPFCPUnscored
URL
Transfer Size
Est Savings
/*! * Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com * License - https://fonta…
14.6 KiB
14.5 KiB
Avoid long main-thread tasks 4 long tasks found
Lists the longest tasks on the main thread, useful for identifying worst contributors to input delay. Learn how to avoid long main-thread tasksTBTUnscored
URL
Start Time
Duration
vercel.app 1st party
237 ms
…chunks/255-091853b4155593e2.js(spendtrak.vercel.app)
3,046 ms
98 ms
https://spendtrak.vercel.app
783 ms
76 ms
…chunks/255-091853b4155593e2.js(spendtrak.vercel.app)
2,436 ms
63 ms
FontAwesome CDN cdn 
50 ms
/5432a717c1.js(kit.fontawesome.com)
2,499 ms
50 ms
Avoid non-composited animations 1 animated element found
Animations which are not composited can be janky and increase CLS. Learn how to avoid non-composited animationsCLSUnscored
Element
Name
🪙
<div class="landing-logo-ring">
Unsupported CSS Property: box-shadow
pulse
More information about the performance of your application. These numbers don't directly affect the Performance score.
Passed audits (14)
Show
92
Accessibility
These checks highlight opportunities to improve the accessibility of your web app. Automatic detection can only detect a subset of issues and does not guarantee the accessibility of your web app, so manual testing is also encouraged.
Best practices
[user-scalable="no"] is used in the <meta name="viewport"> element or the [maximum-scale] attribute is less than 5.
Disabling zooming is problematic for users with low vision who rely on screen magnification to properly see the contents of a web page. Learn more about the viewport meta tag.
Failing Elements
head > meta
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
Document does not have a main landmark.
One main landmark helps screen reader users navigate a web page. Learn more about landmarks.
Failing Elements
html
<html lang="en" data-theme="light">
These items highlight common accessibility best practices.
Additional items to manually check (10)
Hide
Interactive controls are keyboard focusable
Interactive elements indicate their purpose and state
The page has a logical tab order
Visual order on the page follows DOM order
User focus is not accidentally trapped in a region
The user's focus is directed to new content added to the page
HTML5 landmark elements are used to improve navigation
Offscreen content is hidden from assistive technology
Custom controls have associated labels
Custom controls have ARIA roles
These items address areas which an automated testing tool cannot cover. Learn more in our guide on conducting an accessibility review.
Passed audits (19)
Hide
[aria-*] attributes match their roles
[aria-hidden="true"] is not present on the document <body>
[role]s have all required [aria-*] attributes
[role] values are valid
[aria-*] attributes have valid values
[aria-*] attributes are valid and not misspelled
Buttons have an accessible name
Image elements have [alt] attributes
ARIA attributes are used as specified for the element's role
[aria-hidden="true"] elements do not contain focusable descendents
Elements use only permitted ARIA attributes
Background and foreground colors have a sufficient contrast ratio
Document has a <title> element
<html> element has a [lang] attribute
<html> element has a valid value for its [lang] attribute
Links have a discernible name
Touch targets have sufficient size and spacing.
Heading elements appear in a sequentially-descending order
Deprecated ARIA roles were not used
Not applicable (39)
Hide
[accesskey] values are unique
button, link, and menuitem elements have accessible names
Elements with role="dialog" or role="alertdialog" have accessible names.
ARIA input fields have accessible names
ARIA meter elements have accessible names
ARIA progressbar elements have accessible names
Elements with an ARIA [role] that require children to contain a specific [role] have all required children.
[role]s are contained by their required parent element
Elements with the role=text attribute do not have focusable descendents.
ARIA toggle fields have accessible names
ARIA tooltip elements have accessible names
ARIA treeitem elements have accessible names
The page contains a heading, skip link, or landmark region
<dl>'s contain only properly-ordered <dt> and <dd> groups, <script>, <template> or <div> elements.
Definition list items are wrapped in <dl> elements
ARIA IDs are unique
No form fields have multiple labels
<frame> or <iframe> elements have a title
<html> element has an [xml:lang] attribute with the same base language as the [lang] attribute.
Input buttons have discernible text.
<input type="image"> elements have [alt] text
Form elements have associated labels
Links are distinguishable without relying on color.
Lists contain only <li> elements and script supporting elements (<script> and <template>).
List items (<li>) are contained within <ul>, <ol> or <menu> parent elements
The document does not use <meta http-equiv="refresh">
<object> elements have alternate text
Select elements have associated label elements.
Skip links are focusable.
No element has a [tabindex] value greater than 0
Cells in a <table> element that use the [headers] attribute refer to table cells within the same table.
<th> elements and elements with [role="columnheader"/"rowheader"] have data cells they describe.
[lang] attributes have a valid value
<video> elements contain a <track> element with [kind="captions"]
Tables have different content in the summary attribute and <caption>.
All heading elements contain content.
Uses ARIA roles only on compatible elements
Image elements do not have [alt] attributes that are redundant text.
Identical links have the same purpose.
100
Best Practices
Trust and Safety
Ensure CSP is effective against XSS attacks
Ensure proper origin isolation with COOP
Mitigate clickjacking with XFO or CSP
Mitigate DOM-based XSS with Trusted Types
Passed audits (13)
Hide
Uses HTTPS
Avoids deprecated APIs
Avoids third-party cookies
Allows users to paste into input fields
Avoids requesting the geolocation permission on page load
Avoids requesting the notification permission on page load
Displays images with correct aspect ratio
Serves images with appropriate resolution
Page has the HTML doctype
Properly defines charset
No browser errors logged to the console
No issues in the Issues panel in Chrome Devtools
Page has valid source maps
Not applicable (3)
Hide
Redirects HTTP traffic to HTTPS
Use a strong HSTS policy
Detected JavaScript libraries
100
SEO
These checks ensure that your page is following basic search engine optimization advice. There are many additional factors Lighthouse does not score here that may affect your search ranking, including performance on Core Web Vitals. Learn more about Google Search Essentials.
Additional items to manually check (1)
Hide
Structured data is valid
Run these additional validators on your site to check additional SEO best practices.
Passed audits (10)
Hide
Page isn’t blocked from indexing
Document has a <title> element
Document has a meta description
Page has successful HTTP status code
Links have descriptive text
Links are crawlable
robots.txt is valid
Image elements have [alt] attributes
Document has a valid hreflang
Document has a valid rel=canonical