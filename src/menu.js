document.addEventListener("DOMContentLoaded", function () {
    const menu = `
    <div class="navbar bg-base-300">
    <div class="navbar-start">
        <div class="dropdown">
            <label tabindex="0" class="btn btn-ghost lg:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" />
                </svg>
            </label>
            <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                <li><a href="/src/reseau.html"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>Notre Réseau</a></li>
                <li><a href="/src/jo.html"><img
                            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABl0lEQVR4nGNgGAUM9fX/mTq3fgjv2v4hvWv7BxdYkCSVTpZKrexPB2EQGyb+PSjI5XtgYPq34OCw//X1TAzdOz7kdO56DVbQve2Dade294GZFdME0yp7i+vr65lAOLWiryS+vl/ga1BQ8NfgYBOQ2q9+flLfAwOzGXq2fUhDjohpOx/n9fW1ZWS2twvCxArrZwuV9E/JfJkUm4Ws9ntQUBrYBTCBL4dL4jbuONy3a0lD7Ok1tVNeHynlnXNkDu+EPbMmls+YGnOmvbh35on5sUgG5DB0b3lnB/L/2p0nnE7vWzyrd8cHFQaG/4w5tb01Mye3VfbtnF2bWddfDdLwIyhI9WFOytz38dHO4HAICLABm9S76hHnwb0bnT4fLnNFduKZtfUFk/fOKUEWm7t/psv1ylzH//HxHChp8P9/BsYvh8qq/+8s5gbxPx8oj/p8qERv+om5+jOPz48AiU3ZP4Vnxol5Vf///2fEmoD/n6nn+nK4NOnrwbL0zwfKdWHis4/P1pt5Yl76jONzE2eemck1mvoZUAAAB9+7iU0wbSAAAAAASUVORK5CYII=">Les
                        JO avec TCM</a></li>
                <li><a href="/src/trafic.html"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Info Trafic
                    </a></li>
                <li><a href="/src/tarifs.html"><svg class="w-[19px] h-[19px] text-gray-800 dark:text-white"
                            aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 14">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="1.1"
                                d="M16.5 7A2.5 2.5 0 0 1 19 4.5V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v2.5a2.5 2.5 0 1 1 0 5V12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9.5A2.5 2.5 0 0 1 16.5 7Z" />
                        </svg> Tarif</a></li>
                <li><a href="/src/agences.html"><svg class="w-[19px] h-[19px] text-gray-800 dark:text-white"
                            aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="21" height="20" fill="none"
                            viewBox="0 0 21 20">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="1.1"
                                d="M3.308 9a2.257 2.257 0 0 0 2.25-2.264 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 1 0 4.5 0C19.058 5.471 16.956 1 16.956 1H3.045S1.058 5.654 1.058 6.736A2.373 2.373 0 0 0 3.308 9Zm0 0a2.243 2.243 0 0 0 1.866-1h.767a2.242 2.242 0 0 0 3.733 0h.767a2.242 2.242 0 0 0 3.733 0h.767a2.247 2.247 0 0 0 1.867 1A2.22 2.22 0 0 0 18 8.649V19H9v-7H5v7H2V8.524c.37.301.83.469 1.308.476ZM12 12h3v3h-3v-3Z" />
                        </svg> Nos Agences</a></li>
            </ul>
        </div>
        <a class="btn btn-ghost normal-case text-xl hidden dark:block" href="/index.html"><img src="/img/TCM-Clair.png" width="75" height="75"
                alt="Logo TCM"></a>
        <a class="btn btn-ghost normal-case text-xl block dark:hidden" href="/index.html"><img src="/img/TCM-Sombre.png" width="75" height="75"
                alt="Logo TCM"></a>
    </div>
    <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-1">
            <li><a href="/src/reseau.html"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>Notre Réseau</a></li>
            <li><a href="/src/jo.html"><img
                        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABl0lEQVR4nGNgGAUM9fX/mTq3fgjv2v4hvWv7BxdYkCSVTpZKrexPB2EQGyb+PSjI5XtgYPq34OCw//X1TAzdOz7kdO56DVbQve2Dade294GZFdME0yp7i+vr65lAOLWiryS+vl/ga1BQ8NfgYBOQ2q9+flLfAwOzGXq2fUhDjohpOx/n9fW1ZWS2twvCxArrZwuV9E/JfJkUm4Ws9ntQUBrYBTCBL4dL4jbuONy3a0lD7Ok1tVNeHynlnXNkDu+EPbMmls+YGnOmvbh35on5sUgG5DB0b3lnB/L/2p0nnE7vWzyrd8cHFQaG/4w5tb01Mye3VfbtnF2bWddfDdLwIyhI9WFOytz38dHO4HAICLABm9S76hHnwb0bnT4fLnNFduKZtfUFk/fOKUEWm7t/psv1ylzH//HxHChp8P9/BsYvh8qq/+8s5gbxPx8oj/p8qERv+om5+jOPz48AiU3ZP4Vnxol5Vf///2fEmoD/n6nn+nK4NOnrwbL0zwfKdWHis4/P1pt5Yl76jONzE2eemck1mvoZUAAAB9+7iU0wbSAAAAAASUVORK5CYII=">Les
                    JO avec TCM</a></li>
            <li><a href="/src/trafic.html"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Info Trafic
                </a></li>
            <li><a href="/src/tarifs.html"><svg class="w-[19px] h-[19px] text-gray-800 dark:text-white"
                        aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.1"
                            d="M16.5 7A2.5 2.5 0 0 1 19 4.5V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v2.5a2.5 2.5 0 1 1 0 5V12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9.5A2.5 2.5 0 0 1 16.5 7Z" />
                    </svg> Tarif</a></li>
            <li><a href="/src/agences.html"><svg class="w-[19px] h-[19px] text-gray-800 dark:text-white"
                        aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="21" height="20" fill="none"
                        viewBox="0 0 21 20">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.1"
                            d="M3.308 9a2.257 2.257 0 0 0 2.25-2.264 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 1 0 4.5 0C19.058 5.471 16.956 1 16.956 1H3.045S1.058 5.654 1.058 6.736A2.373 2.373 0 0 0 3.308 9Zm0 0a2.243 2.243 0 0 0 1.866-1h.767a2.242 2.242 0 0 0 3.733 0h.767a2.242 2.242 0 0 0 3.733 0h.767a2.247 2.247 0 0 0 1.867 1A2.22 2.22 0 0 0 18 8.649V19H9v-7H5v7H2V8.524c.37.301.83.469 1.308.476ZM12 12h3v3h-3v-3Z" />
                    </svg> Nos Agences</a></li>
        </ul>
    </div>
    <div class="navbar-end">
    </div>
</div>
    `;

    // Insérez le menu dans la page
    document.body.insertAdjacentHTML("afterbegin", menu);
});
