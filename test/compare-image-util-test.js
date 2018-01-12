﻿TEST( 'compareImageUtil makeImage', function test() {
  var image = compareImageUtil.makeImage(300, 200);
  EXPECT_EQ( 300, image.width );
  EXPECT_EQ( 200, image.height );
  EXPECT_EQ( 300, image.pitch );
  EXPECT_EQ( 240000, image.data.length );
  EXPECT_EQ( 0, image.offset );

  var image2 = compareImageUtil.makeImage(image);
  EXPECT_EQ( 300, image2.width );
  EXPECT_EQ( 200, image2.height );
  EXPECT_EQ( 300, image2.pitch );
  EXPECT( image.data === image2.data );
  EXPECT_EQ( 0, image2.offset );

  var imageData = { width: 300, height: 200, data: new Uint8Array(240000) };
  var image3 = compareImageUtil.makeImage(imageData);
  EXPECT_EQ( 300, image3.width );
  EXPECT_EQ( 200, image3.height );
  EXPECT_EQ( 300, image3.pitch );
  EXPECT( imageData.data === image3.data );
  EXPECT_EQ( 0, image3.offset );

  var imageData2 = {
    width: 200,
    height: 100,
    data: imageData.data,
    pitch: 300,
    offset: 15050
  };
  var image4 = compareImageUtil.makeImage(imageData2);
  EXPECT_EQ( 200, image4.width );
  EXPECT_EQ( 100, image4.height );
  EXPECT_EQ( 300, image4.pitch );
  EXPECT( imageData.data === image4.data );
  EXPECT_EQ( 15050, image4.offset );
});

TEST( 'compareImageUtil makeRegion', function test() {
  var image1 = compareImageUtil.makeImage(300, 200);

  var region0 = compareImageUtil.makeRegion(image1);
  EXPECT_EQ( 300, region0.width );
  EXPECT_EQ( 200, region0.height );
  EXPECT_EQ( 300, region0.pitch );
  EXPECT( image1.data === region0.data );
  EXPECT_EQ( 0, region0.offset );

  var region1 = compareImageUtil.makeRegion(image1, 30, 20);
  EXPECT_EQ( 270, region1.width );
  EXPECT_EQ( 180, region1.height );
  EXPECT_EQ( 300, region1.pitch );
  EXPECT( image1.data === region1.data );
  EXPECT_EQ( 300 * 20 + 30, region1.offset );

  var region2 = compareImageUtil.makeRegion(image1, 30, 20, 130, 120);
  EXPECT_EQ( 130, region2.width );
  EXPECT_EQ( 120, region2.height );
  EXPECT_EQ( 300, region2.pitch );
  EXPECT( image1.data === region2.data );
  EXPECT_EQ( 300 * 20 + 30, region2.offset );
});

TEST( 'compareImageUtil makeRegion empty-range', function test() {
  var image1 = compareImageUtil.makeImage(300, 200);

  var region1 = compareImageUtil.makeRegion(image1, 0, 0, 0, 0);
  EXPECT_EQ( 0, region1.width * region1.height );
  EXPECT_EQ( 300, region1.pitch );
  EXPECT( image1.data === region1.data );

  var region2 = compareImageUtil.makeRegion(image1, 50, 50, 0, 0);
  EXPECT_EQ( 0, region2.width * region2.height );
  EXPECT_EQ( 300, region2.pitch );
  EXPECT( image1.data === region2.data );

  var region3 = compareImageUtil.makeRegion(image1, 350, 250);
  EXPECT_EQ( 0, region3.width * region3.height );
  EXPECT_EQ( 300, region3.pitch );
  EXPECT( image1.data === region3.data );

  var region4 = compareImageUtil.makeRegion(image1, 350, 50);
  EXPECT_EQ( 0, region4.width * region4.height );
  EXPECT_EQ( 300, region4.pitch );
  EXPECT( image1.data === region4.data );

  var region5 = compareImageUtil.makeRegion(image1, 50, 250);
  EXPECT_EQ( 0, region5.width * region5.height );
  EXPECT_EQ( 300, region5.pitch );
  EXPECT( image1.data === region5.data );

  var region6 = compareImageUtil.makeRegion(image1, -50, 250);
  EXPECT_EQ( 0, region6.width * region6.height );
  EXPECT_EQ( 300, region6.pitch );
  EXPECT( image1.data === region6.data );

  var region7 = compareImageUtil.makeRegion(image1, 350, -50);
  EXPECT_EQ( 0, region7.width * region7.height );
  EXPECT_EQ( 300, region7.pitch );
  EXPECT( image1.data === region7.data );

  var region8 = compareImageUtil.makeRegion(image1, 350, 250, 100, 100);
  EXPECT_EQ( 0, region8.width * region8.height );
  EXPECT_EQ( 300, region8.pitch );
  EXPECT( image1.data === region8.data );

  var region9 = compareImageUtil.makeRegion(image1, -50, -50, 0, 0);
  EXPECT_EQ( 0, region9.width * region9.height );
  EXPECT_EQ( 300, region9.pitch );
  EXPECT( image1.data === region9.data );

  var region10 = compareImageUtil.makeRegion(image1, -50, -50, 10, 10);
  EXPECT_EQ( 0, region10.width * region10.height );
  EXPECT_EQ( 300, region10.pitch );
  EXPECT( image1.data === region10.data );

  var region11 = compareImageUtil.makeRegion(image1, -50, -50, 50, 50);
  EXPECT_EQ( 0, region11.width * region11.height );
  EXPECT_EQ( 300, region11.pitch );
  EXPECT( image1.data === region11.data );
});

TEST( 'compareImageUtil makeRegion too-big-range', function test() {
  var image1 = compareImageUtil.makeImage(300, 200);

  var region1 = compareImageUtil.makeRegion(image1, 0, 0, 400, 300);
  EXPECT_EQ( 300, region1.width );
  EXPECT_EQ( 200, region1.height );
  EXPECT_EQ( 300, region1.pitch );
  EXPECT_EQ( 0, region1.offset );
  EXPECT( image1.data === region1.data );

  var region2 = compareImageUtil.makeRegion(image1, -50, -50);
  EXPECT_EQ( 300, region2.width );
  EXPECT_EQ( 200, region2.height );
  EXPECT_EQ( 300, region2.pitch );
  EXPECT_EQ( 0, region2.offset );
  EXPECT( image1.data === region2.data );

  var region3 = compareImageUtil.makeRegion(image1, -50, -50, 400, 300);
  EXPECT_EQ( 300, region3.width );
  EXPECT_EQ( 200, region3.height );
  EXPECT_EQ( 300, region3.pitch );
  EXPECT_EQ( 0, region3.offset );
  EXPECT( image1.data === region3.data );

  var region4 = compareImageUtil.makeRegion(image1, -50, -50, 300, 200);
  EXPECT_EQ( 250, region4.width );
  EXPECT_EQ( 150, region4.height );
  EXPECT_EQ( 300, region4.pitch );
  EXPECT_EQ( 0, region4.offset );
  EXPECT( image1.data === region4.data );

  var region5 = compareImageUtil.makeRegion(image1, -50, -50, 100, 100);
  EXPECT_EQ( 50, region5.width );
  EXPECT_EQ( 50, region5.height );
  EXPECT_EQ( 300, region5.pitch );
  EXPECT_EQ( 0, region5.offset );
  EXPECT( image1.data === region5.data );

  var region6 = compareImageUtil.makeRegion(image1, 50, 50, 300, 200);
  EXPECT_EQ( 250, region6.width );
  EXPECT_EQ( 150, region6.height );
  EXPECT_EQ( 300, region6.pitch );
  EXPECT_EQ( 300 * 50 + 50, region6.offset );
  EXPECT( image1.data === region6.data );
});

TEST( 'compareImageUtil fill', function test() {
  var image1 = compareImageUtil.makeImage(300, 200);
  for (var i = 0; i < 240000; ++i) {
    image1.data[i] = 55;
  }

  compareImageUtil.fill(image1, 20, 40, 60, 80);

  EXPECT_EQ( 20, image1.data[0] );
  EXPECT_EQ( 40, image1.data[1] );
  EXPECT_EQ( 60, image1.data[2] );
  EXPECT_EQ( 80, image1.data[3] );
  EXPECT_EQ( 20, image1.data[299 * 4] );
  EXPECT_EQ( 40, image1.data[299 * 4 + 1] );
  EXPECT_EQ( 60, image1.data[299 * 4 + 2] );
  EXPECT_EQ( 80, image1.data[299 * 4 + 3] );
  EXPECT_EQ( 20, image1.data[300 * 4 * 199 + 299 * 4] );
  EXPECT_EQ( 40, image1.data[300 * 4 * 199 + 299 * 4 + 1] );
  EXPECT_EQ( 60, image1.data[300 * 4 * 199 + 299 * 4 + 2] );
  EXPECT_EQ( 80, image1.data[300 * 4 * 199 + 299 * 4 + 3] );

  var region1 = compareImageUtil.makeRegion(image1, 20, 10, 100, 50);
  for (var i = 0; i < 240000; ++i) {
    image1.data[i] = 55;
  }

  compareImageUtil.fill(region1, 20, 40, 60, 80);

  EXPECT_EQ( 55, image1.data[0] );
  EXPECT_EQ( 55, image1.data[1] );
  EXPECT_EQ( 55, image1.data[2] );
  EXPECT_EQ( 55, image1.data[3] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 199 + 299 * 4] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 199 + 299 * 4 + 1] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 199 + 299 * 4 + 2] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 199 + 299 * 4 + 3] );

  EXPECT_EQ( 55, image1.data[300 * 4 * 9 + 20 * 4] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 9 + 20 * 4 + 1] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 9 + 20 * 4 + 2] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 9 + 20 * 4 + 3] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 10 + 19 * 4] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 10 + 19 * 4 + 1] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 10 + 19 * 4 + 2] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 10 + 19 * 4 + 3] );
  EXPECT_EQ( 20, image1.data[300 * 4 * 10 + 20 * 4] );
  EXPECT_EQ( 40, image1.data[300 * 4 * 10 + 20 * 4 + 1] );
  EXPECT_EQ( 60, image1.data[300 * 4 * 10 + 20 * 4 + 2] );
  EXPECT_EQ( 80, image1.data[300 * 4 * 10 + 20 * 4 + 3] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 10 + 120 * 4] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 10 + 120 * 4 + 1] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 10 + 120 * 4 + 2] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 10 + 120 * 4 + 3] );

  EXPECT_EQ( 55, image1.data[300 * 4 * 59 + 19 * 4] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 59 + 19 * 4 + 1] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 59 + 19 * 4 + 2] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 59 + 19 * 4 + 3] );
  EXPECT_EQ( 20, image1.data[300 * 4 * 59 + 119 * 4] );
  EXPECT_EQ( 40, image1.data[300 * 4 * 59 + 119 * 4 + 1] );
  EXPECT_EQ( 60, image1.data[300 * 4 * 59 + 119 * 4 + 2] );
  EXPECT_EQ( 80, image1.data[300 * 4 * 59 + 119 * 4 + 3] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 59 + 120 * 4] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 59 + 120 * 4 + 1] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 59 + 120 * 4 + 2] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 59 + 120 * 4 + 3] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 60 + 119 * 4] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 60 + 119 * 4 + 1] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 60 + 119 * 4 + 2] );
  EXPECT_EQ( 55, image1.data[300 * 4 * 60 + 119 * 4 + 3] );
});

TEST( 'compareImageUtil convolution', function test() {
  var makeImageForConvolutionTest = function(bitmap) {
    var image = compareImageUtil.makeImage(4, 4);
    for (var i = 0; i < 16; ++i) {
      image.data[i * 4 + 0] = bitmap[i];
      image.data[i * 4 + 1] = bitmap[i];
      image.data[i * 4 + 2] = bitmap[i];
      image.data[i * 4 + 3] = 255;
    }
    return image;
  };
  var checkConvolutionResult = function(name, result, expected) {
    for (var i = 0; i < 16; ++i) {
      var label = (i + 1) + 'th pixel of ' + name;
      EXPECT_EQ( 128 + expected[i], result.data[i * 4 + 0], label );
      EXPECT_EQ( 128 + expected[i], result.data[i * 4 + 1], label );
      EXPECT_EQ( 128 + expected[i], result.data[i * 4 + 2], label );
    }
  };

  var image1 = makeImageForConvolutionTest([
      0,   0,   0,   0,
      0, 100, 100,   0,
      0,  50,   0,   0,
      0,   0,   0,  50
  ]);

  var result1 = compareImageUtil.makeImage(4, 4);
  compareImageUtil.convolution(result1, image1, { w: 3, h: 1 }, [
    1, 0, -1
  ]);
  checkConvolutionResult('result1 (horizontal kernel)', result1, [
      0,   0,    0,    0,
    100, 100, -100, -100,
     50,   0,  -50,    0,
      0,   0,   50,   50
  ]);

  var result2 = compareImageUtil.makeImage(4, 4);
  compareImageUtil.convolution(result2, image1, { w: 1, h: 3 }, [
    0.20,
    0.60,
    0.20
  ]);
  checkConvolutionResult('result2 (vertical kernel)', result2, [
    0,  20, 20,  0,
    0,  70, 60,  0,
    0,  50, 20, 10,
    0,  10,  0, 40
  ]);

  var result3 = compareImageUtil.makeImage(4, 4);
  compareImageUtil.convolution(result3, image1, { w: 3, h: 3 }, [
    0.0, 0.1, 0.0,
    0.1, 0.6, 0.1,
    0.0, 0.1, 0.0
  ]);
  checkConvolutionResult('result3 (3x3 kernel)', result3, [
     0,  10, 10,  0,
    10,  75, 70, 10,
     5,  40, 15,  5,
     0,   5,  5, 40
  ]);

  var image2 = makeImageForConvolutionTest([
      0,   0,   0,   0,
      0,  10,   0,   0,
      0,   0,   0,   0,
      0,   0,   0,   0
  ]);

  var result4 = compareImageUtil.makeImage(4, 4);
  compareImageUtil.convolution(result4, image2, { w: 3, h: 3 }, [
    1, 2, 3,
    4, 5, 6,
    7, 8, 9
  ]);
  checkConvolutionResult('result4 (3x3 kernel)', result4, [
     10, 20, 30, 0,
     40, 50, 60, 0,
     70, 80, 90, 0,
      0,  0,  0, 0
  ]);

  var result5 = compareImageUtil.makeImage(4, 4);
  compareImageUtil.convolution(result5, image2, { w: 5, h: 5 }, [
    1,  2,  3,  4,  5,
    2,  3,  4,  5,  6,
    3,  4,  5,  6,  7,
    4,  5,  6,  7,  8,
    5,  6,  7,  8,  9
  ]);
  checkConvolutionResult('result5 (5x5 kernel)', result5, [
     30, 40, 50, 60,
     40, 50, 60, 70,
     50, 60, 70, 80,
     60, 70, 80, 90
  ]);
});
