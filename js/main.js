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
        
        parties(attribute);
        
    };
    
    function parties(attribute){
        
        var party = document.getElementById("party");
        
        party.innerHTML = "";
        
        var info = { "Social Democratic": "<b>The Social Democratic Party (Socialdemokratiska Arbetarpartiet): 28.3% votes, 100 seats</b><br><br>The Social Democratic Party was founded in 1889 and is currently the oldest and largest political party in Sweden. It is a labor party with principles based on freedom and equality. The party leader is Stefan Löfven, who is also the Prime Minister of Sweden. The Social Democratic Party is currently part of the electoral alliance, the Red Greens, with the Green Party and the Left Party.", "Moderate": "<b>The Moderate Party (Moderata Samlingspartiet): 19.8% votes, 70 seats</b><br><br>The Moderate Party was founded in 1904 as the General Electoral League with the goal of promoting conservatism in the Riksdag. The party changed its name to the Right in 1938, the Right Party in 1952, and the Moderate Party in 1968. Its ideology is liberal conservatism and supports personal freedom, free markets, privatization, deregulation, lowering tax rates, and a reduction of the public-sector growth rate. The party leader is Ulf Kristersson. The Moderate Party was a member of the electoral alliance, the Alliance, until its dissolution in 2019.", "Swedish Democratic": "<b>The Sweden Democratic Party (Sverigedemokraterna): 17.5% votes, 62 seats</b><br><br>The Sweden Democratic Party was founded in 1988 as a director successor to the Sweden Party, which had been formed in 1986 when the BSS Party (Keep Sweden Swedish, Swedish: Bevara Sverige Svenskt) and a faction of the Swedish Progress Party merged. The Sweden Democratic Party has its roots in Swedish fascism and the Neo-Nazi movement of the early 1990s. The Party now officially rejects fascism and Nazism. Its current ideology is based on national conservatism, right wing populism, and anti-immigration. The party leader is Jimmie Åkesson. The Sweden Democrats is not part of any electoral alliance.", "Center": "<b>The Centre Party (Centerpartiet): 8.6% votes, 31 seats</b><br><br>The Centre Party was founded in 1913 as the Farmer’s League. Its name changed to the Center Party in 1957. It is a liberal party with roots in Nordic agrarianism. The Centre Party’s principles are focused free market economics, environmental protection, and decentralization of governmental authority. The party leader is Annie Lööf. The Centre Party was once closely allied with the Social Democratic Party but revised its strategies to become closer to the center-right of the political spectrum. The Centre Party was a member of the electoral alliance, the Alliance, until its dissolution in 2019.", "Left": "<b>The Left Party (Vänsterpartiet): 8.0% votes, 28 seats</b><br><br>The Left Party was created when the Swedish Social Democratic Party split in 1917 and became the Swedish Social Democratic Left Party. Its name changed to the Communist Party of Sweden in 1921, the Left Party - the Communists in 1967, and the Left Party in 1990.  The Left Party is a socialist party that opposes all types of privatization and advocates for increased public expenditure. The party leader is Jonas Sjöstedt. The Left Party is currently part of the electoral alliance, the Red-Greens, with the Social Democratic Party and the Green Party.", "Christian Democratic": "<b>The Christian Democratic Party (Kristdemokraterna): 6.3% votes, 22 seats</b><br><br>The Christian Democratic Party was created in 1964 as the Christian Democratic Unity after the 1963 movement against the government’s decision to remove all religious education in school. The party changed its name to the Christian Democratic Party in 1996. Its ideology can be described as a mix of Christian democracy, conservatism, and social conservatism. The Christian Democratic Party's platform emphasizes the improvement of elderly care, decreasing regulations on companies, lowering taxes to promote growth and combat unemployment, and freedom of choice for families with children in selecting their childcare. The party leader is Ebba Thor. The Christian Democratic Party was a member of the electoral alliance, the Alliance, until its dissolution in 2019.", "Liberal": "<b>The Liberal Party (Liberalerna): 5.5% votes, 20 seats</b><br><br>The Liberal Party was created in 1934 as the People’s Party but has roots as far back as the Coup of 1809 when the first liberal party was formed in Sweden. In 2015, the party changed its name to the Liberal Party. Its ideology is social liberalism. It supports a mixed economy with comprehensive but marked-based state programs. The party leader is Nyamko Sabuni. The Liberal Party was a member of the electoral alliance, the Alliance, until its dissolution in 2019.", "Green": "<b>The Green Party (Miljöpartiet de Gröna): 4.4% votes, 16 seats</b><br><br>The Green Party was founded in 1981 after discontent over environmental policies and the 1980 nuclear power referendum. Its ideology is based on creating a sustainable society while promoting equality, women’s rights, solidarity with animals, global ecologism, and social justice. The Green Party is the only party that has two spokespersons instead of party leaders. The spokespersons are Per Bolund and Isabella Lövin. The Green party is currently part of the electoral alliance, the Red-Greens, with the Social Democratic Party and the Left Party.", "Feminist": "<b>The Feminist Initiative (Feministiskt Initiativ): 0.4% votes, 0 seats</b><br><br>The Feminist Initiative was founded in 2005 by the Left Party’s former party leader, Gudrun Schyman. Its ideology is based on principles of radical feminism, human rights, social justice, and gender equality. The party leaders are Gita Nabavi and Farida al-Abani. The Feminist Initiative is not part of any electoral alliance.", "Other": "Parties with less than 4% of the vote are not represented in parliament. There were 25 minority parties included on the 2018 ballot, including: the Feminist Initiative, the Pirate Party, and Alternative for Sweden."
        }
        
        party.innerHTML= info[attribute];
        
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
        
        var content = "<h1>" + formatName + " </h1>Percent of Vote for the " + expressed + " Party: " + props[expressed] + " % <br>Population: " + population + "<br> Population Density: " + contentID.POPDENS + " per square kilometer <br> Median Age: " + contentID.MEDIANAGE + " years <br> Percent of Population Born Outside Sweden: " + birthplace + "% <br> Percent of Population with Higher Education: " + highered + "% <br> Average Annual Disposable Income: " + dispincomeSEK + " SEK (" + dispincomeUSD + " USD) <br> Percent of Urban & Built Up Land: " + landuse + "%";
        
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
            .style("stroke", "#9ECAE1")
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


