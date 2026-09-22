if ($(".highpro ").length) {
    var galleryTop = new Swiper(".highpro-l", {
        centeredSlides: !0,
        touchRatio: 0.2,
        speed: 1e3,
        spaceBetween: 10,
    });
    var galleryThumbs = new Swiper(".highpro-r-box", {
        spaceBetween: 10,
        pagination: ".highpro-l .swiper-pagination",
        paginationClickable: !0,
        speed: 1e3,
        onSlideChangeStart: function (e) {
            $(".highpro-step li")
                .eq(e.activeIndex)
                .addClass("highpro-step-act")
                .siblings()
                .removeClass("highpro-step-act");
        },
    });
    galleryTop.params.control = galleryThumbs;
    galleryThumbs.params.control = galleryTop;
    $(".highpro-step li").click(function () {
        $(this)
            .addClass("highpro-step-act")
            .siblings()
            .removeClass("highpro-step-act"),
            galleryThumbs.slideTo($(this).index(), 1e3, !1);
    });
}
$(".hotprocate li").eq(0).addClass("hotprocate-act");
$(".hotprocate li").click(function () {
    $(this).addClass("hotprocate-act").siblings().removeClass("hotprocate-act"),
        $(".hotpro-list")
            .eq($(this).index())
            .addClass("hotpro-list-act")
            .siblings()
            .removeClass("hotpro-list-act");
});



if($('#wmkc-certificate-swiper').length){var swiper = new Swiper('#wmkc-certificate-swiper', {
    pagination: '.swiper-pagination',
    paginationClickable: true,
    slidesPerView: 4,
    spaceBetween: 20,
    loop:true,
    nextButton: '.wmkc-pro-prev',
    prevButton: '.wmkc-pro-next',
    breakpoints: {
        1024: {
            slidesPerView: 4,
            spaceBetween: 20
        },
        768: {
            slidesPerView: 3,
            spaceBetween: 20
        },
        640: {
            slidesPerView: 2,
            spaceBetween: 10
        },
        320: {
            slidesPerView: 1,
            spaceBetween: 10
        }
    }
});}
if($('.pro-detail .content iframe').length==1){
    var a=$('.pro-detail .content iframe').attr('src');
    var b= a.substring(a.lastIndexOf('/')+1,a.length);
    $('.pro-detail .content iframe').attr('src',a+'?loop=1&playlist='+b)
}
else if($('.pro-detail .content iframe').length>1){console.log(2);
$('.pro-detail .content iframe').each(function(){
    var a=$(this).attr('src');
    var b= a.substring(a.lastIndexOf('/')+1,a.length);
    $(this).attr('src',a+'?loop=1&playlist='+b)
})
}
