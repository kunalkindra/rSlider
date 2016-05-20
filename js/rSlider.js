(function(MODULE, $, undefined) {
    /**
    * @constructor
    * @params {domEl} el - rSLider Parent
    * @params {object} options - rSLider config options
    */
    MODULE.RangeSlider = function(el, options) {
        this.init(el, options);
    };
    /**
    * @prototype
    */
    MODULE.RangeSlider.prototype = (function() {

        //default config options.
        var defaults = {
                value: 0,   //Default value on load
                start: 0,   //Start point on bar - can be/not be equal to min
                end: 0,   //End point on bar - can be/not be equal to min
                min: 0,    //Min val the slider can take, start <= min <= max <= end
                max: 90,    //Max val the slider can take, start <= min <= max <= end
                animDuration: 100,  //in milliseconds, used when clicked on bar
                stepSize: 1,    //Hop size, resolution, to control no of values between start and end
                showScale: true,    //Markings below the bar showing values
                cueBGClass: '',    //Add a custom background to your cue using this class
                showOutputOnCue: true,   //Show current value on top of cue
                customScale: null   //Show custom values on scale other than values, takes an array of strings
            },
            util = {
                isTouchDevice: function() {
                    return "ontouchstart" in window;
                }
            };

        return {
            init: function(el, config) {
                var oThis = this;

                oThis.$parent = $(el);

                oThis.opts = $.extend({}, defaults, config);

                oThis.createStructure();

                oThis.setDefaults();

                oThis.setInitailVal();

                oThis.bindEvents();
            },
            createStructure: function() {
                var oThis = this,
                    opts = oThis.opts;


                //This is the element to which touch/drag events are attached to
                oThis.$touchArea = $('<div class="rSlider"></div>').appendTo(oThis.$parent);

                //The cue positioner
                oThis.$ptr = $('<div class="rSlider__pointer"></div>').appendTo(oThis.$touchArea);

                //Cue
                oThis.$cue = $('<div class="rSlider__cue"></div>').appendTo(oThis.$ptr);

                if (opts.cueBGClass) {
                    oThis.$cue.addClass(opts.cueBGClass);
                } else {
                    oThis.$cue.addClass('bm-type_default');
                }

                if (opts.cueHTML) {
                    oThis.$cue.append(opts.cueHTML);
                } else {
                    oThis.$cue.append('<div class="vHamburger absCenter js-gNavTrigger hidden-xs hidden-sm">' + 
                        '<div class="vHamburger__line"></div>' +
                        '<div class="vHamburger__line"></div>' + 
                        '<div class="vHamburger__line"></div>' + 
                        '</div>')
                }

                oThis.$disp = $('<div class="rSlider__val"></div>').appendTo(oThis.$cue).hide();
                if (opts.showOutputOnCue) {
                    oThis.$disp.show();
                }

                //Filled bar
                oThis.$fBar = $('<div class="rSlider__bar bm-type_filled"></div>').appendTo(oThis.$touchArea);
                
                //Empty bar
                oThis.$eBar = $('<div class="rSlider__maskCont bm-type_left"><div class="rSlider__bar bm-type_filled bm-type_mask"></div></div><div class="rSlider__bar bm-type_empty"></div><div class="rSlider__maskCont  bm-type_right"><div class="rSlider__bar bm-type_empty bm-type_mask"></div></div>').appendTo(oThis.$touchArea);

                //While drag/touchmove, this overlays the entire screen, to enable drag on the entire screen
                oThis.$overlay = $('<div class="rOverlay"></div>').appendTo(oThis.$parent);

                if (opts.showScale) {
                    oThis.$scale = $('<div class="rScale"></div>').appendTo(oThis.$parent);
                    oThis.createScale();
                }

                //hack
                var hackWidth = oThis.$cue.width(),
                    maskElLeft = oThis.$touchArea.find('.rSlider__maskCont.bm-type_left'),
                    maskElRight = oThis.$touchArea.find('.rSlider__maskCont.bm-type_right');
                maskElLeft.width(hackWidth/2);
                maskElRight.width(hackWidth/2);
                oThis.$parent.css({
                    'padding-right':  hackWidth/2,
                    'padding-left': hackWidth/2
                });
                oThis.$scale.css({
                    'margin-right':  -hackWidth/2,
                    'margin-left': -hackWidth/2
                });
                oThis.$touchArea = oThis.$touchArea.add(maskElLeft).add(maskElRight);
            },
            createScale: function() {
                var oThis = this,
                    opts = oThis.opts,
                    createFrags;

                createFrags = function(arr) {
                    var valArr = arr,
                        valCount = valArr.length,
                        scaleFragStart = '<div class="rScale__marking">',
                        scaleFragEnd = '</div>',
                        tempDocFrag = document.createDocumentFragment(),
                        frag,
                        fragSeperation = 100 / (valCount - 1);
                    for (var i = 0; i < valCount; i++) {
                        frag = $(scaleFragStart + valArr[i] + scaleFragEnd);
                        frag.css('left', (fragSeperation * i) + '%');
                        frag.appendTo(tempDocFrag);
                    }

                    oThis.$scale.append(tempDocFrag);
                };

                if (!opts.customScale || opts.customScale.length === 0) {
                    if (!opts.showAllMark) {
                        createFrags([opts.start, opts.end]);
                    }
                } else {
                    createFrags(oThis.opts.customScale);
                }
            },
            setDefaults: function() {
                var opts = this.opts;

                if (opts.max === undefined) opts.max = opts.end;

                if (opts.min === undefined) opts.min = opts.start;
            },
            setInitailVal: function() {
                var oThis = this,
                    opts = oThis.opts,
                    pVal;

                oThis.range = opts.end - opts.start;

                pVal = oThis.getPercentVal(opts.value);

                oThis.setValueOnClick(pVal);
            },
            setValueOnClick: function(percentVal) {
                var oThis = this,
                    opts = oThis.opts,
                    actualVal = oThis.getActualValue(percentVal),
                    closestStep = oThis.getClosestStep(actualVal);
                processedVal = oThis.getPercentVal(closestStep);

                oThis.displayValue(closestStep);

                $(oThis).trigger('finalValueChanged');

                oThis.isCueDragged = false;
                oThis.$ptr.animate({
                    'left': processedVal + '%'
                }, oThis.opts.animDuration);
                oThis.$fBar.animate({
                    'width': processedVal + '%'
                }, oThis.opts.animDuration);
            },
            getActualValue: function(percentVal) {
                return this.opts.start + (this.range * percentVal) / 100;
            },
            getPercentVal: function(val) {
                return ((val - this.opts.start) / this.range) * 100;
            },
            displayValue: function(val) {
                var opts = this.opts;

                if (!opts.customValue || opts.customValue.length === 0) {
                    this.$disp.text(val);
                } else {
                    this.$disp.text(this.getCustomValue(val));
                }
                this.val = val;
                $(this).trigger('tempValueChange');
            },
            getCustomValue: function(val) {
                var opts = this.opts;
                this.customVal = opts.customValue[Math.round((val - opts.start) / opts.stepSize)];

                return this.customVal;
            },
            getClosestStep: function(val) {
                var oThis = this,
                    opts = oThis.opts,
                    result,
                    sign;
                if (val >= opts.max) {
                    result = opts.max;
                } else if (val <= opts.min) {
                    result = opts.min;
                } else {
                    var rem = val % opts.stepSize,
                        closestVal = val - rem;

                    if (Math.abs(rem) >= opts.stepSize / 2) {
                        sign = closestVal > 0 ? 1 : -1;
                        closestVal = closestVal + sign * opts.stepSize;
                    }

                    result = closestVal;
                    if (result >= opts.max) {
                        result = opts.max;
                    } else if (result <= opts.min) {
                        result = opts.min;
                    }
                }
                return result;
            },
            bindEvents: function() {
                var oThis = this;

                if (util.isTouchDevice()) {
                    oThis.$touchArea.on('click', function(e) {
                        oThis.onBarClick(e);
                    });

                    $('body')
                        .on('touchstart', function(e) {
                            if (e.target === oThis.$cue[0]) {
                                e.preventDefault();
                                e.stopPropagation();
                                oThis.cueActive = true;
                            }
                        })
                        .on('touchend', function(e) {
                            oThis.cueActive = false;
                            if (oThis.isCueDragged) {
                                oThis.setValueOnClick(oThis.tempValOnDrag);
                            }
                        })
                        .on('touchmove', function(e) {
                            if (oThis.cueActive) {
                                e.preventDefault();
                                oThis.onCueDrag(e);
                            }
                        });
                } else {
                    oThis.$touchArea.on('click', function(e) {
                        oThis.onBarClick(e);
                    });
                    oThis.$cue.on('mousedown', function(e) {
                        e.stopPropagation();
                        oThis.cueActive = true;
                        oThis.$overlay.show();
                    });
                    oThis.$overlay.on('mousemove', function(e) {
                        e.stopPropagation();
                        if (oThis.cueActive) {
                            oThis.onCueDrag(e);
                        }
                    });
                    oThis.$overlay.on('mouseup mouseout', function(e) {
                        e.stopPropagation();
                        oThis.cueActive = false;
                        oThis.$overlay.hide();
                        if (oThis.isCueDragged) {
                            oThis.setValueOnClick(oThis.tempValOnDrag);
                        }
                    });
                }

                if (util.isTouchDevice()) {} else {}
            },
            onBarClick: function(evt) {
                var oThis = this,
                    userX = evt.clientX,
                    offX = oThis.$parent.offset().left,
                    pVal = ((userX - offX) / oThis.$parent.width()) * 100;

                oThis.setValueOnClick(pVal);
            },
            onCueDrag: function(e) {
                var oThis = this,
                    evt = e,
                    userX = evt.clientX || evt.originalEvent.touches[0].clientX,
                    offX = oThis.$parent.offset().left,
                    ptrX = oThis.$ptr.offset().left,
                    pVal = ((userX - offX - oThis.$cue.width()/2) / oThis.$parent.width()) * 100,
                    setTempCueValue;

                setTempCueValue = function(pVal) {
                    oThis.$ptr.css({
                        'left': pVal + '%'
                    });
                    oThis.$fBar.css({
                        'width': pVal + '%'
                    });

                    oThis.isCueDragged = true;
                    oThis.tempValOnDrag = pVal;

                    oThis.displayValue(oThis.getClosestStep(oThis.getActualValue(pVal)));
                };

                if (pVal <= 100 && pVal >= 0) {
                    setTempCueValue(pVal);
                } else if (pVal > 100) {
                    setTempCueValue(100);
                } else if (pVal < 0) {
                    setTempCueValue(0);
                }

            }
        };
    }());

    // convert above  rSlider class into jquery plugin.
    $.fn.rSlider = function(options) {
        return this.each(function() {
            var obj = $(this);
            if (!obj.data("rSlider")) {
                obj.data("rSlider", new MODULE.RangeSlider(this, options));
            }
            return obj;
        });
    };

})(window, jQuery);
