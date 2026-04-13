/**
 * script.js - Interactivity for OpenClaw Cracked landing page
 * Features:
 * - Sticky header toggles 'is-sticky' class on scroll
 * - Smooth scrolling for navigation links and CTA buttons
 * - Mobile menu toggle with focus management and outside click/ESC handling
 * - Form validation for email subscription
 * - Section visibility animations via IntersectionObserver
 * - FAQ accordion toggle analytics
 */

(() => {
  'use strict';

  // Threshold for sticky header activation (px)
  const STICKY_THRESHOLD = 50;
  // Regex for email validation
  const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

  let header;
  let nav;
  let toggle;
  let navLinks;
  let ctaButtons;
  let subscribeForm;
  let emailInput;
  let emailError;
  let sections;
  let io;

  /**
   * Assert ARIA attributes on interactive elements
   */
  function assertARIA() {
    const elements = document.querySelectorAll(
      '.index-nav a[data-target], .index-btn-primary, .index-btn-buy, #subscribe-form input, #subscribe-form button'
    );
    elements.forEach(el => {
      if (!el.getAttribute('aria-label') && !el.hasAttribute('role')) {
        console.error('ARIA attribute missing on element:', el);
      }
    });
  }

  /**
   * Analytics handler for CTA clicks
   */
  function analyticsHandler(e) {
    const target = e.detail.target;
    if (window.Analytics && typeof window.Analytics.trackEvent === 'function') {
      window.Analytics.trackEvent('cta_clicked', { target });
    } else {
      console.warn('Analytics event (fallback):', target);
    }
  }

  /**
   * Initialize sticky header behavior
   */
  function initStickyHeader() {
    header = document.querySelector('.index-header');
    if (!header) return;
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function onScroll() {
    header.classList.toggle('is-sticky', window.scrollY > STICKY_THRESHOLD);
  }

  /**
   * Initialize smooth scrolling for navigation links
   */
  function initNavScroll() {
    navLinks = document.querySelectorAll('.index-nav a[data-target]');
    navLinks.forEach(link => {
      const target = link.getAttribute('data-target');
      if (!document.querySelector(`[data-anchor="${target}"]`)) {
        console.warn(`No section found for nav target: ${target}`);
      }
      link.addEventListener('click', e => {
        e.preventDefault();
        const dest = e.currentTarget.getAttribute('data-target');
        window.dispatchEvent(new CustomEvent('navigate:to', { detail: { target: dest } }));
      });
    });
  }

  /**
   * Initialize mobile navigation toggle
   */
  function initMobileMenu() {
    nav = document.querySelector('.index-nav');
    toggle = document.querySelector('.index-nav-toggle');
    if (!nav || !toggle) return;

    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
      if (isOpen && navLinks && navLinks.length) {
        navLinks[0].focus();
      } else {
        toggle.focus();
      }
    });

    // Close menu on outside click
    document.addEventListener('click', e => {
      if (nav.classList.contains('open') && !nav.contains(e.target) && e.target !== toggle) {
        closeMobileMenu();
      }
    });

    // Close menu on ESC key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        closeMobileMenu();
      }
    });

    // Close menu on resize beyond mobile breakpoint
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && nav.classList.contains('open')) {
        closeMobileMenu();
      }
    });
  }

  function closeMobileMenu() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  /**
   * Handler for navigate:to events
   */
  function initNavigateHandler() {
    window.addEventListener('navigate:to', e => {
      scrollToAnchor(e.detail.target);
    });
  }

  function scrollToAnchor(anchor) {
    const section = document.querySelector(`[data-anchor="${anchor}"]`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Initialize CTA button interactions
   */
  function initCTAInteractions() {
    ctaButtons = document.querySelectorAll('.index-btn-primary[data-target], .index-btn-buy[data-target]');
    ctaButtons.forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget.getAttribute('data-target');
        if (target) {
          window.dispatchEvent(new CustomEvent('cta:clicked', { detail: { target } }));
        }
      });
    });

    window.addEventListener('cta:clicked', e => {
      scrollToAnchor(e.detail.target);
    });
  }

  /**
   * Initialize section visibility via IntersectionObserver
   */
  function initSectionObserver() {
    sections = document.querySelectorAll('section[data-anchor]');
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const threshold = 0.2;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--observer-threshold');
    const designThreshold = parseFloat(raw);
    if (isNaN(designThreshold)) {
      console.warn('Design token --observer-threshold missing or invalid');
    } else if (designThreshold !== threshold) {
      console.warn(`Observer threshold ${threshold} does not match design token ${designThreshold}`);
    }

    io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          window.dispatchEvent(new CustomEvent('section:entered', {
            detail: { anchor: entry.target.getAttribute('data-anchor') }
          }));
        }
      });
    }, { threshold });

    sections.forEach(sec => io.observe(sec));
  }

  /**
   * Initialize FAQ accordion toggle analytics
   */
  function initFAQToggle() {
    const items = document.querySelectorAll('.index-faq-item');
    items.forEach(item => {
      const question = item.querySelector('.index-faq-question');
      const answer = item.querySelector('.index-faq-answer');
      if (question && answer) {
        question.addEventListener('click', () => {
          const open = item.classList.toggle('open');
          answer.style.maxHeight = open ? answer.scrollHeight + 'px' : '0';
          question.setAttribute('aria-expanded', open);
          answer.setAttribute('aria-hidden', !open);
          window.dispatchEvent(new CustomEvent('faq:questionToggled', {
            detail: { question: question.textContent.trim(), open }
          }));
        });
        question.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            question.click();
          }
        });
      }
    });
  }

  /**
   * Initialize subscription form validation
   */
  function initFormValidation() {
    subscribeForm = document.getElementById('subscribe-form');
    if (!subscribeForm) return;
    emailInput = document.getElementById('email');
    emailError = document.getElementById('email-error');
    if (emailError) {
      emailError.style.display = 'none';
      emailInput.addEventListener('input', () => {
        if (emailError.style.display === 'block') {
          emailError.style.display = 'none';
        }
      });
    }
    subscribeForm.addEventListener('submit', onFormSubmit);
  }

  function onFormSubmit(e) {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!EMAIL_REGEX.test(email)) {
      if (emailError) {
        emailError.style.display = 'block';
      }
      emailInput.focus();
      return;
    }
    if (emailError) {
      emailError.style.display = 'none';
    }
    window.dispatchEvent(new CustomEvent('cta:clicked', { detail: { target: 'subscription' } }));
    subscribeForm.innerHTML = '<p>Thank you! Check your inbox for the next steps.</p>';
  }

  /**
   * DOMContentLoaded initializer
   */
  document.addEventListener('DOMContentLoaded', () => {
    assertARIA();
    initStickyHeader();
    initNavScroll();
    initMobileMenu();
    window.addEventListener('section:entered', e => {
      navLinks.forEach(link =>
        link.classList.toggle('is-active', link.getAttribute('data-target') === e.detail.anchor)
      );
    });
    initNavigateHandler();
    initSectionObserver();
    initCTAInteractions();
    window.addEventListener('cta:clicked', analyticsHandler);
    initFAQToggle();
    initFormValidation();
  });
})();