(function(){
        
    var attrArray = ["Social Democratic", "Moderate", "Swedish Democratic", "Center", "Left", "Christian Democratic", "Liberal", "Green", "Feminist", "Other"];
    
    var expressed = attrArray[0];

    window.onload = setMap();
    
    function setMap() {
        
        var width = window.innerWidth * 0.40,
            height = 600;
    
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
    
        var projection = d3.geoAlbers()
            .center([0, 62])
            .rotate([-17, 0, 0])
            .parallels([45, 25])
            .scale(2500)
            .translate([width / 2, height / 2]);
    
        var path = d3.geoPath()
            .projection(projection);
    
        d3.queue()
            .defer(d3.csv, "data/riksdag.csv")
            .defer(d3.json, "data/countries.topojson")
            .defer(d3.json, "data/valkretsar.topojson")
            .await(callback);
    
        function callback(error, csvData, countries, provinces) {
        
            setGraticule(map, path);
            
            var countriesData = topojson.feature(countries, countries.objects.countries);
        
            var provinceData = topojson.feature(provinces, provinces.objects.valkretsar).features;
        
            provinceData = joinData(provinceData, csvData);
            
            var colorScale = createColorScale(csvData);
            setEnumerationUnits(provinceData, countriesData, map, path, colorScale, csvData);
            
            createDropdown(csvData);
        
        };
        
    };
         
    function setGraticule(map, path){
    
        var graticule = d3.geoGraticule()
            .step([10, 10]);
        
        var gratBackground = map.append("path")
            .datum(graticule.outline())
            .attr("class", "gratBackground")
            .attr("d", path);
        
        var gratLines = map.selectAll(".gratLines")
            .data(graticule.lines())
            .enter()
            .append("path")
            .attr("class", "gratLines")
            .attr("d", path);
        return;
    };
    
    function joinData(provinceData, csvData){
        for (var i=0; i<csvData.length; i++) {
            var csvState = csvData[i];
            var csvKey = csvState.NAME;
            
            for (var a=0; a<provinceData.length; a++) {
                var geojsonProps = provinceData[a].properties;
                var geojsonKey = geojsonProps.NAME;
                
                if (geojsonKey == csvKey){
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvState[attr]);
                        
                        geojsonProps[attr] = val;
                    });
                };
            };
           
        }; 
        
        return provinceData;
    };
    
    function setEnumerationUnits(provinceData, countriesData, map, path, colorScale, csvData){
        var countriesMap = map.append("path")
            .datum(countriesData)
            .attr("class", "countries")
            .attr("d", path);
        
        var provinceMap = map.selectAll(".provinceMap")
            .data(provinceData)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "provinceMap " + d.properties.NAME;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
                highlight(d.properties, csvData);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            });
        
        var desc = provinceMap.append("desc")
            .text('{"stroke": "#FFF", "stroke-width": "0.25px"}');
        
        return;
    }; 
    
    function createColorScale(data){
        var colorClasses = [
            "#9ECAE1",
            "#6BAED6",
            "#4292C6",
            "#2171B5",
            "#084594"
        ];
        
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);
        
        var domainArray = [];
        
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        }
            
        var clusters = ss.ckmeans(domainArray, 5);
        
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        
        domainArray.shift();
        
        colorScale.domain(domainArray);
        
        return colorScale;
    };
    
    function choropleth(props, colorScale){
        var val = parseFloat(props[expressed]);
        
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#CCC";
        }
    };
    
    function createDropdown(csvData){
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
               
                changeAttribute(this.value, csvData)
            });
        
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");
        
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){
                return d 
            })
            .text(function(d){
                return d
            });
    };
    
    function changeAttribute(attribute, csvData){
        expressed = attribute;
        
        var colorScale = createColorScale(csvData);
        
        var provinces = d3.selectAll(".provinceMap")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });
        
    };
    
    function highlight(props, csv){
        var selected = d3.selectAll("." + props.NAME)
            .style("stroke", "#FED976")
            .style("stroke-width", "2");
        
        retrieve(props, csv);
    };
    
    function dehighlight(props){
        var selected = d3.selectAll("." + props.NAME)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });
        
        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();
            
            var styleObject = JSON.parse(styleText);
            
            return styleObject[styleName];
        };
        
        var removeText = document.getElementById("retrieve");
        
        removeText.innerHTML = "";
        
    };
    
    function retrieve(props, csv){
                
        var id = props.ID;
        
        var contentID = csv[id-1];
    
        var addText = document.getElementById("retrieve");
        
        var formatName = props.NAME.replace(new RegExp("_", "g"), " ");
                
        var population = thousandSeparator(Math.round(contentID.POPULATION));
        
        var valueBP = contentID.BIRTHPLACE*100;   
    
        var birthplace = valueBP.toFixed(2);
        
        var valueHE = contentID.HIGHERED*100;
        
        var highered = valueHE.toFixed(2);
        
        var dispincomeSEK = thousandSeparator(Math.round(contentID.DISPINCOME));
        
        var dispincomeUSD = thousandSeparator(Math.round(contentID.DISPINCOME*0.11));
        
        var valueL = contentID.LANDUSE*100;
        
        var landuse = valueL.toFixed(2);
        
        function thousandSeparator(x){
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };
        
        var content = "<h1>" + formatName + " </h1><br>Percent of Vote for Party: " + props[expressed] + " % <br>Population: " + population + "<br> Population Density: " + contentID.POPDENS + " per square kilometer <br> Median Age: " + contentID.MEDIANAGE + " years <br> Percent of Population Born Outside Sweden: " + birthplace + "% <br> Percent of Population with Higher Education: " + highered + "% <br> Average Annual Disposable Income: " + dispincomeSEK + " SEK (" + dispincomeUSD + " USD) <br> Percent of Urban & Built Up Land: " + landuse + "%";
        
        addText.innerHTML = content;
        
    };
    
    
    
    
    
    //Parallel Plot
    
            // set the dimensions and margins of the graph
        var margin = {top: 30, right: 10, bottom: 10, left: -20},
          width = window.innerWidth * 0.60,
          height = 250 - margin.top - margin.bottom;

        // append the svg object to the body of the page
        var svg = d3.select("#my_dataviz")
        .append("svg")
          .attr("width", width)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // Parse the Data
        d3.csv("data/riksdag2.csv", function(data) {
            console.log(data); 
          // Extract the list of dimensions we want to keep in the plot. Here I keep all except the column called Species
          dimensions = d3.keys(data[0]).filter(function(d) { return d != "ID" })

          // For each dimension, I build a linear scale. I store all in a y object
          var y = {}
          for (i in dimensions) {
            name = dimensions[i]
            y[name] = d3.scaleLinear()
              .domain( d3.extent(data, function(d) { return +d[name]; }) )
              .range([height, 0])
          }

          // Build the X scale -> it find the best position for each Y axis
          x = d3.scalePoint()
            .range([0, width])
            .padding(1)
            .domain(dimensions);

          // The path function take a row of the csv as input, and return x and y coordinates of the line to draw for this raw.
          function path(d) {
              return d3.line()(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
          }

          // Draw the lines
          svg
            .selectAll("myPath")
            .data(data)
            .enter().append("path")
            .attr("d",  path)
            .style("fill", "none")
            .style("stroke", "#69b3a2")
            .style("opacity", 0.5)

          // Draw the axis:
          svg.selectAll("myAxis")
            // For each dimension of the dataset I add a 'g' element:
            .data(dimensions).enter()
            .append("g")
            // I translate this element to its right position on the x axis
            .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
            // And I build the axis with the call function
            .each(function(d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
            // Add axis title
            .append("text")
              .style("text-anchor", "middle")
              .attr("y", -9)
              .text(function(d) { return d; })
              .style("fill", "black")

        })
    
    
    
    
    
    
    
    
    
})();


