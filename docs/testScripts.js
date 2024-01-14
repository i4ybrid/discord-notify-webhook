
function injectNewJquery() {
  var script = document.createElement('script');
  script.src = "https://code.jquery.com/jquery-3.7.1.min.js";
  script.type = 'text/javascript';
  script.onload = function() {
      var $ = window.jQuery;
      console.log('jQuery version:', $.fn.jquery);
  };
  document.getElementsByTagName('head')[0].appendChild(script); 
}
