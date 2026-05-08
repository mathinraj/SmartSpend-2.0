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
67
Performance
92
Accessibility
100
Best Practices
100
SEO
67
FCP
+10
LCP
+24
TBT
+2
CLS
+25
SI
+6
Performance
Values are estimated and may vary. The performance score is calculated directly from these metrics.See calculator.
0–49
50–89
90–100
Final Screenshot

Metrics
Collapse view
First Contentful Paint
0.7 s
First Contentful Paint marks the time at which the first text or image is painted. Learn more about the First Contentful Paint metric.
Largest Contentful Paint
1.0 s
Largest Contentful Paint marks the time at which the largest text or image is painted. Learn more about the Largest Contentful Paint metric
Total Blocking Time
900 ms
Sum of all time periods between FCP and Time to Interactive, when task length exceeded 50ms, expressed in milliseconds. Learn more about the Total Blocking Time metric.
Cumulative Layout Shift
0
Cumulative Layout Shift measures the movement of visible elements within the viewport. Learn more about the Cumulative Layout Shift metric.
Speed Index
2.0 s
Speed Index shows how quickly the contents of a page are visibly populated. Learn more about the Speed Index metric.
Captured at Apr 20, 2026, 2:37 PM GMT+5:30
Emulated Desktop with Lighthouse 13.0.1
Single page session
Initial page load
Custom throttling
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
Use efficient cache lifetimes Est savings of 6 KiB
Legacy JavaScript Est savings of 12 KiB
LCP breakdown
Network dependency tree
Font display Est savings of 20 ms
Render blocking requests
Optimize DOM size
3rd parties
These insights are also available in the Chrome DevTools Performance Panel - record a trace to view more detailed information.
Diagnostics
Minimize main-thread work 2.9 s
Reduce unused JavaScript Est savings of 22 KiB
Reduce unused CSS Est savings of 14 KiB
Avoid long main-thread tasks 7 long tasks found
Avoid non-composited animations 1 animated element found
More information about the performance of your application. These numbers don't directly affect the Performance score.
Passed audits (14)
Hide
Layout shift culprits
Document request latency
Duplicated JavaScript
Forced reflow
Improve image delivery
INP breakdown
LCP request discovery
Optimize viewport for mobile
Minify CSS
Minify JavaScript
Avoids enormous network payloads Total size was 350 KiB
User Timing marks and measures
JavaScript execution time 1.1 s
Image elements have explicit width and height
92
Accessibility
These checks highlight opportunities to improve the accessibility of your web app. Automatic detection can only detect a subset of issues and does not guarantee the accessibility of your web app, so manual testing is also encouraged.
Best practices
[user-scalable="no"] is used in the <meta name="viewport"> element or the [maximum-scale] attribute is less than 5.
Document does not have a main landmark.
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
