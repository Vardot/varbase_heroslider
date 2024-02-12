/**
 * @file
 * Behaviors of Varbase heroslider for Youtube video scripts.
 */

(function ($, Drupal) {
  Drupal.behaviors.varbaseHeroSlider_youtube = {
    attach(context) {
      const mediaSliders = $(
        '.slick--view--varbase-heroslider .slick__slider',
        context,
      );
      // On before slide change.
      mediaSliders.on(
        'beforeChange',
        function (event, slick, currentSlide, nextSlide) {
          const currentVideo = $(`.slide--${currentSlide}.slick-active`).find(
            '.varbase-video-player iframe[src*="youtube.com"]',
            context,
          );
          if (currentVideo.length > 0) {
            currentVideo.get(0).contentWindow.postMessage('pause', '*');
          }
        },
      );

      // On after slide change.
      mediaSliders.on('afterChange', function (event, slick, currentSlide) {
        const currentVideo = $(`.slide--${currentSlide}.slick-active`).find(
          '.varbase-video-player iframe[src*="youtube.com"]',
          context,
        );
        if (currentVideo.length > 0) {
          currentVideo.get(0).contentWindow.postMessage('play', '*');
        } else {
          mediaSliders.slick('slickPlay');
        }
      });

      // On first slide load.
      const firstIframeVideo = $('.varbase-heroslider')
        .find('.slide')
        .first()
        .find('.varbase-video-player iframe[src*="youtube.com"]', context);
      if (firstIframeVideo.length > 0) {
        firstIframeVideo.on('load', function () {
          mediaSliders.slick('slickPause');
          $(this).get(0).contentWindow.postMessage('play', '*');
        });
      }

      function youtubeActionProcessor(e) {
        if (e.data === 'endedYoutube' || e.message === 'endedYoutube') {
          if ($('.varbase-heroslider .slide').length > 1) {
            // When having 2 or more slides.
            mediaSliders.slick('slickNext');
          } else {
            // When only having one Youtube slide.
            firstIframeVideo.get(0).contentWindow.postMessage('play', '*');
          }
        } else if (
          e.data === 'playingYoutube' ||
          e.message === 'playingYoutube'
        ) {
          mediaSliders.slick('slickPause');
        }
      }

      // Setup the event listener for messaging.
      if (window.addEventListener) {
        window.addEventListener('message', youtubeActionProcessor, false);
      } else {
        window.attachEvent('onmessage', youtubeActionProcessor);
      }
    },
  };
})(window.jQuery, window.Drupal);
