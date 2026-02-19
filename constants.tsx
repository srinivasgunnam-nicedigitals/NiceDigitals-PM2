
import React from 'react';
import {
  ProjectStage,
  Priority
} from './types';
import {
  Paintbrush,
  Code,
  Search,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  ClipboardCheck,
  ShieldCheck
} from 'lucide-react';

export const STAGE_CONFIG = {
  [ProjectStage.UPCOMING]: { label: 'Upcoming', icon: <Clock className="w-5 h-5" />, color: 'bg-slate-100 text-slate-600' },
  [ProjectStage.DESIGN]: { label: 'Design Phase', icon: <Paintbrush className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-600' },
  [ProjectStage.DEVELOPMENT]: { label: 'Development', icon: <Code className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600' },
  [ProjectStage.QA]: { label: 'QA Testing', icon: <Search className="w-5 h-5" />, color: 'bg-amber-100 text-amber-600' },
  [ProjectStage.ADMIN_REVIEW]: { label: 'Admin Review', icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600' },
  [ProjectStage.SEND_TO_CLIENT]: { label: 'Send to Client', icon: <Send className="w-5 h-5" />, color: 'bg-sky-100 text-sky-600' },
  [ProjectStage.SENT_TO_CLIENT]: { label: 'Sent to Client', icon: <ExternalLink className="w-5 h-5" />, color: 'bg-cyan-100 text-cyan-600' },
  [ProjectStage.COMPLETED]: { label: 'Completed', icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-600' },
};

export const PRIORITY_CONFIG = {
  [Priority.LOW]: { label: 'Low', color: 'bg-slate-100 text-slate-700' },
  [Priority.MEDIUM]: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  [Priority.HIGH]: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  [Priority.URGENT]: { label: 'Urgent', color: 'bg-red-100 text-red-700 border border-red-200' },
};

export const INITIAL_CHECKLISTS = {
  DESIGN: [
    { id: 'd1', label: 'Home page design completed and shared with the client', completed: false },
    { id: 'd2', label: 'Feedback received, currently working on home page revisions', completed: false },
    { id: 'd3', label: 'Home page design approved and final files shared with the developer', completed: false },
    { id: 'd4', label: 'Inner page designs completed and shared with the client', completed: false },
    { id: 'd5', label: 'All inner page designs approved and final files shared with the developer', completed: false },
  ],
  DEVELOPMENT: [
    { id: 'dev1', label: 'Verify WordPress setting: Site is set to discourage search engine crawling', completed: false },
    { id: 'dev2', label: 'All links, buttons & CTAs working correctly', completed: false },
    { id: 'dev3', label: 'Forms validated and submit successfully', completed: false },
    { id: 'dev4', label: 'Navigation menu fully functional on every page', completed: false },
    { id: 'dev5', label: 'All pages with real content completed and functional', completed: false },
    { id: 'dev6', label: 'Desktop, Tablet & Mobile layouts implemented and tested', completed: false },
    { id: 'dev7', label: 'No overlapping or cut-off content in any resolution', completed: false },
    { id: 'dev8', label: 'Mobile menu opens/closes properly', completed: false },
    { id: 'dev9', label: 'Caching properly configured', completed: false },
    { id: 'dev10', label: 'Page loading speed reasonable (performance optimized)', completed: false },
    { id: 'dev11', label: 'Proper heading hierarchy applied (H1 -> H2 -> H3)', completed: false },
    { id: 'dev12', label: 'Development completed strictly as per client guidelines', completed: false },
    { id: 'dev13', label: 'I don’t have any questions regarding the content or images, everything looks good to me', completed: false },
    { id: 'dev14', label: 'Status updated: Development Completed -> Sent to QA', completed: false },
  ],
  QA: [
    { id: 'qa1', label: 'Design matches the approved designs (pixel-perfect check)', completed: false },
    { id: 'qa2', label: 'Brand colors, fonts, and icons are applied correctly', completed: false },
    { id: 'qa3', label: 'Hover and active button states are implemented as per design', completed: false },
    { id: 'qa4', label: 'Typography and sizing are consistent throughout', completed: false },
    { id: 'qa5', label: 'All links, buttons, and CTAs are working correctly', completed: false },
    { id: 'qa6', label: 'Forms are validated and submitted successfully', completed: false },
    { id: 'qa7', label: 'Email notifications are delivered properly', completed: false },
    { id: 'qa8', label: 'Interactive elements (sliders, tabs, galleries) work smoothly', completed: false },
    { id: 'qa9', label: 'Navigation menu functions correctly on all pages', completed: false },
    { id: 'qa10', label: 'No overlapping content or layout breaking issues', completed: false },
    { id: 'qa11', label: 'Proper spacing, padding, and alignment maintained across devices', completed: false },
    { id: 'qa12', label: 'Touch elements are fully usable on mobile', completed: false },
    { id: 'qa13', label: 'Images are optimized (WebP or compressed formats)', completed: false },
    { id: 'qa14', label: 'Pages load within reasonable time limits', completed: false },
    { id: 'qa15', label: 'Cache settings are properly applied', completed: false },
    { id: 'qa16', label: 'Lazy loading is enabled for media where required', completed: false },
    { id: 'qa17', label: 'SSL is active and HTTPS secure padlock visible', completed: false },
    { id: 'qa18', label: 'No console errors present in browser developer tools', completed: false },
    { id: 'qa19', label: 'Correct heading structure maintained (H1 → H2 → H3)', completed: false },
    { id: 'qa20', label: 'Meta titles and descriptions assigned for key pages', completed: false },
    { id: 'qa21', label: 'Sitemap and robots configurations working properly', completed: false },
    { id: 'qa22', label: 'No broken links (404 check validated)', completed: false },
    { id: 'qa23', label: 'Content reviewed for grammar, spelling, and accuracy', completed: false },
    { id: 'qa24', label: 'Cross-browser testing completed (Chrome, Firefox, Edge, Safari)', completed: false },
    { id: 'qa25', label: 'All pages contain final approved content and function properly', completed: false },
    { id: 'qa26', label: 'Desktop, tablet, and mobile layouts implemented and verified', completed: false },
    { id: 'qa27', label: 'Favicon added and visible on all devices', completed: false },
    { id: 'qa28', label: 'I don’t have any questions regarding the content or images, everything looks good to me', completed: false },
    { id: 'qa29', label: 'Project marked as “QA Completed” and updated in the project management system', completed: false },
  ],
  FINAL: [
    { id: 'f1', label: 'Final Quality Polish & UI Checks', completed: false },
    { id: 'f2', label: 'Content Consistency & Spelling Verify', completed: false },
    { id: 'f3', label: 'Responsive Testing across all screens', completed: false },
    { id: 'f4', label: 'Functionality & Form Validation Final', completed: false },
    { id: 'f5', label: 'Client Communication Ready (Email/Files)', completed: false },
  ],
};

export const SCORING_RULES = {
  DELIVERY: 10,
  ON_TIME: 5,
  QA_FIRST_PASS: 2,
  EARLY_PER_DAY: 1,
  QA_REJECTION: -5,
  DEADLINE_MISSED: -10,
  DELAY_PER_DAY: -2,
};
